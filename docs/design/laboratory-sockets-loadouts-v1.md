# Laboratory sockets, loadouts and respec (Phase C.3, v1)

Status: built on `feature/lab-frostfire-mutation`. Builds on [`spell-blueprint-contracts-v1.md`](spell-blueprint-contracts-v1.md) and [`laboratory-frostfire-slice-v1.md`](laboratory-frostfire-slice-v1.md).

## 1. Rules

- **Two sockets at most:** `LaboratoryCatalog.MaxEquippedMutations = 2`.
- **One primary cast still applies.** Of the equipped mutations, only the one whose foundation is the hunt's primary wakes; the other stays dormant. Two equipped mutations never mean two attack streams.
- **One mutation per foundation:** equipping a second mutation on the same foundation is refused (`FoundationTaken`) because it could never wake.
- **Sockets are generic, by element.** Each socket sits on an existing Arcane Web bridge node and accepts any blueprint that shares at least one of its elements. Only `BlueprintValidator`'s `SocketRejects` decides this, and it fires when the socket accepts none of the blueprint's elements (the documented contract; the earlier "all elements" check was tightened back to it).
- **Path prerequisites:** a socket is usable only while its bridge node is allocated. Refunding it unequips just that socket's mutation, with a notice; the recipe is kept.

| Socket | Bridge node | Accepts | Fits today |
|---|---|---|---|
| Rimebrand (home of Rime Infusion) | `hybrid-fire-frost-2` | Fire, Frost | Rime Infusion |
| Charged Focus (home of Storm Infusion) | `hybrid-storm-arcane-2` | Storm, Arcane | Storm Infusion |
| Flashfire | `hybrid-fire-storm-2` | Fire, Storm | both |
| Glacial Lens | `hybrid-arcane-frost-2` | Arcane, Frost | both |

So a player can run both mutations from two bridges that suit their route, instead of being forced down both home routes.

## 2. Domain

- `LaboratoryState` keeps a socket → mutation map.
  - `Equip(id, socket, nodes)` moves a mutation that is already slotted and replaces an occupant (a swap).
  - `CheckEquip` answers the same question without changing state; the UI uses it to explain each socket.
  - `Equip(id, nodes)` auto-places: current socket, else home socket, else the first free compatible socket.
  - Also: `Unequip(id)`, `Unequip()`, `EquippedMutations`, `SocketOf`, and `PreparedFor`, which returns the list for unlocked sockets.
- Results: `NotStabilized`, `SocketLocked`, `InvalidBlueprint`, `IncompatibleSocket`, `FoundationTaken`, `SocketLimitReached`.
- **Save:** `LaboratorySave.Slots` holds `"Socket:Mutation"` entries.
  - `Equipped` is still written (first slot) so older builds keep one mutation.
  - Saves without `Slots` migrate `Equipped` into its home socket.
  - Restore drops entries that are unstabilized, incompatible, duplicated, on a taken foundation, or over the limit.
- `LaboratoryAdvisor` suggests equipping a second stabilized mutation when a free compatible socket is unlocked.
- **Simulation:** `RunSimulationFactory.Create(..., preparedMutations)` → `PrepareLaboratoryMutations` de-duplicates, keeps one per foundation and trims to the limit. `ChoosePrimary` wakes only the matching mutation.

## 3. Loadouts and free respec

- `Progression/Loadouts/HuntLoadoutBook`: three slots (Loadout I/II/III), each holding the Arcane Web nodes plus the socket map. Persisted under `wyrmforge.loadouts.v1`.
- **Apply is a free respec:** no currency and no cooldown.
  - It re-selects affordable, connected nodes (`PassiveTreeSelection.RestoreNodes`), clears the sockets, then re-equips each saved mutation only if that is still legal.
  - Anything skipped is reported in the result and in a notice; nothing is forced.
- The manual full respec (↺ on the Atlas) is unchanged and was already free.
- **UI:** a compact LOADOUTS strip above the Atlas.
  - Tap an empty slot, then SAVE.
  - A filled slot shows APPLY, OVERWRITE and CLEAR; the two destructive actions take two taps.
  - Touch targets are at least 44 px. No new hub row (mobile budget).
- **Laboratory UI:** the stabilized section lists the mutation's compatible sockets with their state (locked → ATLAS, free → EQUIP, occupied → SWAP, holding it → UNEQUIP) and an "n/2 equipped" header. The Forge status line joins the equipped names. The primary-magic choice shows a badge on every spell with a matching mutation.

## 4. Validation

- Domain 203, Application 314 and JS 107 tests pass.
- Captured at 390×844: equip in two sockets → save Loadout I → respec (sockets cleared) → apply (8 nodes and both mutations restored) → reload → both primary badges.

## 5. Open decisions (product owner)

- The names and placement of the two new bridge sockets (Flashfire, Glacial Lens).
- Whether a loadout should also remember the Forge offering or the primary spell. v1 keeps it to Web plus sockets.
