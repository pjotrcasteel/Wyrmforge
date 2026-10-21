/* Exactly aligned transparent PNG cutouts of the approved night panorama.
   Created once per mounted scene: no per-NPC work, no copied paving rectangle. */
export const CUTOUTS = [
    {
        id: "noticeboard-panel", x: 712, y: 412, width: 101, height: 100,
        path: "M713 455 L721 447 L732 441 L753 437 L777 428 L799 416 L805 420 L810 431 L809 439 L800 441 L800 484 L795 491 L783 494 L771 490 L748 499 L730 505 L718 505 L713 495 Z"
    },
    {
        id: "noticeboard-supports", x: 724, y: 475, width: 78, height: 74,
        path: "M726 481 L742 478 L749 535 L747 545 L733 547 L729 505 Z M779 477 L798 474 L797 533 L790 542 L784 540 L782 495 Z"
    },
    {
        id: "well-roof", x: 806, y: 384, width: 132, height: 87,
        path: "M808 438 L818 428 L821 417 L831 408 L839 399 L841 390 L853 387 L864 394 L880 399 L898 411 L908 418 L926 432 L932 445 L934 454 L924 465 L910 466 L897 462 L872 465 L841 464 L818 463 L808 455 Z"
    },
    {
        id: "well-supports", x: 815, y: 445, width: 107, height: 84,
        path: "M821 451 L839 451 L839 521 L833 525 L822 524 Z M898 451 L918 450 L920 519 L909 524 L899 521 Z"
    },
    {
        id: "well-front-rim", x: 698, y: 491, width: 252, height: 78,
        path: "M705 519 L722 509 L737 501 L761 499 L787 494 L816 496 L849 496 L885 499 L917 503 L937 515 L942 524 L946 541 L933 554 L916 563 L886 566 L759 566 L736 561 L715 552 L702 539 Z"
    },
    {
        // Only the raised parapet, not the entire walkable Nexus terrace.
        // A large duplicate-floor SVG previously hid walkers on actual paving.
        id: "nexus-terrace-parapet", x: 39, y: 397, width: 289, height: 73,
        path: "M43 403 L81 407 L112 411 L153 413 L181 420 L216 425 L247 431 L283 440 L318 449 L323 464 L304 466 L279 454 L242 444 L203 439 L166 432 L129 424 L91 419 L52 417 Z"
    },
    {
        // The low bushes remain in front of a citizen's legs when they pass behind
        // the terrace edge; nearby paving is transparent, not an extra solid floor.
        id: "nexus-terrace-bushes", x: 335, y: 420, width: 147, height: 61,
        path: "M337 450 L350 439 L360 429 L377 430 L389 437 L400 430 L422 436 L437 442 L455 441 L472 451 L479 466 L470 473 L453 471 L436 470 L420 466 L407 468 L393 463 L369 467 L353 469 L337 459 Z"
    },
    {
        // Independent shrub tuft beside the Nexus stairs; not the stairs themselves.
        id: "nexus-stairs-shrubs", x: 497, y: 411, width: 49, height: 53,
        path: "M499 432 L505 418 L513 414 L523 419 L535 431 L542 445 L537 460 L525 459 L513 451 L499 448 Z"
    }
];

const cutoutCache = new WeakSet();

export async function mountTownCutoutsAndRouteSelection(dotnet) {
    const scene = document.querySelector(".refuge-canonical-scene");
    if (!scene || cutoutCache.has(scene)) return;
    cutoutCache.add(scene);
    const base = scene.querySelector(".refuge-town-night-base");
    if (!base) return;

    // Debug taps inspect polygons in All/Walk/Block/Cover and choose a route in
    // Route mode. Normal gameplay, building hotspots and panning remain untouched.
    let press = null;
    const down = e => { press = { x: e.clientX, y: e.clientY, dragged: false }; };
    const move = e => {
        if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10)
            press.dragged = true;
    };
    const clear = () => { press = null; };
    const polygonContains = (polygon, point) => {
        const vertices = polygon.points;
        let inside = false;
        for (let i = 0, j = vertices.numberOfItems - 1; i < vertices.numberOfItems; j = i++) {
            const a = vertices.getItem(i), b = vertices.getItem(j);
            if ((a.y > point.y) !== (b.y > point.y) &&
                point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x)
                inside = !inside;
        }
        return inside;
    };
    const pick = e => {
        const active = document.querySelector(".refuge-town-geometry-toolbar [data-town-layer-select][aria-pressed='true']");
        if (!active) return;
        if (press?.dragged) { press = null; return; }
        press = null;
        const mode = active.dataset.townLayerSelect;
        const output = document.querySelector("[data-town-geometry-selection]");
        if (mode === "Route") {
            const moving = [...scene.querySelectorAll(
                '.refuge-town-citizen[data-town-citizen-state="walking"]'
            )];
            if (!moving.length) return;
            let chosen = null, minimum = Infinity;
            for (const person of moving) {
                const box = person.getBoundingClientRect();
                const distance = (box.left + box.width / 2 - e.clientX) ** 2 +
                    (box.bottom - e.clientY) ** 2;
                if (distance < minimum) {
                    minimum = distance;
                    chosen = Number(person.dataset.townCitizenId);
                }
            }
            if (!Number.isInteger(chosen)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            if (output) output.textContent = "ROUTE · NPC " + chosen;
            dotnet.invokeMethodAsync("SelectTownRouteCitizen", chosen).catch(() => {});
            return;
        }

        // Building hotspots still open normally, including in the debug overlay.
        if (e.target.closest(".refuge-town-spot")) return;
        const rect = scene.getBoundingClientRect();
        const point = {
            x: (e.clientX - rect.left) / rect.width * 1672,
            y: (e.clientY - rect.top) / rect.height * 941
        };
        const selector = mode === "Walkable" ? "[data-town-floor]" :
            mode === "Blocked" ? "[data-town-obstacle]" :
            mode === "Occlusion" ? "[data-town-foreground]" :
            "[data-town-obstacle], [data-town-floor], [data-town-foreground]";
        const shapes = [...scene.querySelectorAll(".refuge-town-geometry-map polygon" + selector)];
        // All mode prioritizes solid feet collisions above overlapping floor regions.
        shapes.sort((a, b) => Number(b.hasAttribute("data-town-obstacle")) -
            Number(a.hasAttribute("data-town-obstacle")));
        const selected = shapes.find(shape => polygonContains(shape, point));
        scene.querySelectorAll("[data-town-selected]").forEach(shape =>
            shape.removeAttribute("data-town-selected"));
        if (selected) selected.dataset.townSelected = "true";
        if (output) {
            const type = selected?.hasAttribute("data-town-obstacle") ? "BLOCK" :
                selected?.hasAttribute("data-town-floor") ? "WALK" :
                selected?.hasAttribute("data-town-foreground") ? "COVER" : "UNMAPPED";
            const id = selected?.dataset.townObstacle ?? selected?.dataset.townFloor ??
                selected?.dataset.townForeground ?? `${Math.round(point.x)}, ${Math.round(point.y)}`;
            output.textContent = type + " · " + id;
        }
    };

    scene.addEventListener("pointerdown", down, { passive: true });
    scene.addEventListener("pointermove", move, { passive: true });
    scene.addEventListener("pointercancel", clear);
    scene.addEventListener("click", pick, true);
    // Reuse the canonical image already on screen. Browser canvas produces real,
    // tightly bounded transparent PNG data, never a duplicated rectangular painting.
    try {
        if (!base.complete) await new Promise((resolve, reject) => {
            base.addEventListener("load", resolve, { once: true });
            base.addEventListener("error", reject, { once: true });
        });
        if (typeof base.decode === "function") await base.decode();
        if (!scene.isConnected) return;

        for (const cutout of CUTOUTS) {
            const target = scene.querySelector(`[data-town-cutout="${cutout.id}"]`);
            if (!target) continue;
            const canvas = document.createElement("canvas");
            canvas.width = cutout.width;
            canvas.height = cutout.height;
            const context = canvas.getContext("2d");
            if (!context) continue;
            context.drawImage(base, cutout.x, cutout.y, cutout.width, cutout.height,
                0, 0, cutout.width, cutout.height);
            context.globalCompositeOperation = "destination-in";
            context.translate(-cutout.x, -cutout.y);
            context.fill(new Path2D(cutout.path));
            target.src = canvas.toDataURL("image/png");
            target.dataset.townPngReady = "true";
        }
    } catch (error) {
        // The main painting remains visible. An optional foreground extraction
        // cannot break walking, navigation, town interactions or gameplay.
        console.warn("Refuge foreground PNG generation unavailable.", error);
    }
}
