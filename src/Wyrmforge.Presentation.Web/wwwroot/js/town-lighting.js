/* Shared town clock for web, iOS WKWebView and Android WebView.
 * The local Date object always reads the running device's configured clock.
 * No geolocation, server timezone or permission request is necessary.
 *
 * World/NPC progression owns building states. This module only changes
 * the environmental painting and color-matched daytime vacant layers. */
(() => {
    "use strict";

    const storageKey = "wyrmforge.townLighting.v1";
    const modes = new Set(["auto", "day", "night"]);
    const sunriseHour = 7;
    const sunsetHour = 19;
    const assetBase = "art/town/";
    let mode = readMode();
    let effective = null;
    let observer = null;
    let refreshQueued = false;
    let timer = null;
    let loadedDay = false;

    function readMode() {
        try {
            const stored = window.localStorage.getItem(storageKey);
            return modes.has(stored) ? stored : "auto";
        } catch { return "auto"; }
    }

    function hour(date) { return date.getHours(); }

    function resolveMode(setting, date = new Date()) {
        const selection = modes.has(setting) ? setting : "auto";
        return selection === "auto"
            ? (hour(date) >= sunriseHour && hour(date) < sunsetHour ? "day" : "night")
            : selection;
    }

    function versionFrom(source) {
        return source?.match(/[?&]v=([^&#]+)/)?.[1] ?? "132";
    }

    function assetUrl(path, version) {
        return new URL(assetBase + path + "?v=" + encodeURIComponent(version), document.baseURI).href;
    }

    function setAsset(image, filename, version) {
        const next = assetUrl(filename, version);
        if (image.src !== next) image.src = next;
    }

    function applyToScene() {
        const scene = document.querySelector(".refuge-canonical-scene");
        if (!scene) return;
        const next = resolveMode(mode);
        const base = scene.querySelector(".refuge-town-night-base, .refuge-town-base, img[src*='night-active.webp']");
        if (!base) return;
        const version = versionFrom(base.getAttribute("src"));
        // With image assets loaded, change only src. The scene is not remounted
        // and the player's current scroll/camera location does not move.
        setAsset(base, next === "day" ? "day-active.webp" : "night-active.webp", version);

        for (const patch of scene.querySelectorAll(".refuge-town-vacant-layer")) {
            const from = patch.dataset.townAsset ?? patch.getAttribute("src") ?? "";
            const name = patch.dataset.townAsset || from.match(/(?:day|night)-vacant-(ArcaneNexus|Blacksmith|Codex|HallOfFame)\.(?:png|webp)/)?.[1];
            if (!name) continue;
            patch.dataset.townAsset = name;
            setAsset(patch, next === "day" ? `day-vacant-${name}.webp` : `night-vacant-${name}.png`, version);
        }
        scene.dataset.townTime = next;
        scene.setAttribute("aria-label", next === "day" ? "Daytime Refuge town square" : "Nighttime Refuge town square");
        if (effective !== next) {
            effective = next;
            window.dispatchEvent(new CustomEvent("wyrmforge:town-time", {detail: {mode, effective}}));
        }
    }

    function apply() {
        refreshQueued = false;
        applyToScene();
    }

    function scheduleApply() {
        if (refreshQueued) return;
        refreshQueued = true;
        queueMicrotask(apply);
    }

    function preload() {
        if (loadedDay || typeof Image === "undefined") return;
        loadedDay = true;
        const image = new Image();
        image.src = assetUrl("day-active.webp", "132");
    }

    function setMode(next) {
        if (!modes.has(next)) throw new RangeError("Invalid town lighting mode");
        mode = next;
        try { window.localStorage.setItem(storageKey, mode); } catch { /* Private browsing */ }
        scheduleApply();
        if (mode === "auto" || mode === "day") preload();
        return getState();
    }

    function getState() {
        return {mode, effective: resolveMode(mode), localHour: hour(new Date())};
    }

    function onStorage(event) {
        if (event.key && event.key !== storageKey) return;
        mode = readMode();
        scheduleApply();
    }

    function start() {
        if (timer !== null) return;
        scheduleApply();
        const root = document.getElementById("app") || document.body;
        if (typeof MutationObserver !== "undefined") {
            observer = new MutationObserver(scheduleApply);
            observer.observe(root, {subtree:true, childList:true});
        }
        // The auto mode crosses boundaries while an app stays open. Refresh when
        // the device wakes, tab becomes visible, timezone/clock changes, or every minute.
        timer = window.setInterval(scheduleApply, 60000);
        document.addEventListener("visibilitychange", scheduleApply);
        window.addEventListener("pageshow", scheduleApply);
        window.addEventListener("focus", scheduleApply);
        window.addEventListener("storage", onStorage);
        if (resolveMode(mode) === "day") preload();
    }

    window.wyrmforgeTownLighting = {getMode: () => mode, getState, setMode, refresh: scheduleApply, resolveMode, start};
    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", start, {once:true});
    else start();
})();
