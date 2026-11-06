# Right-facing idle and Fire cast

The source sheet has four body-only idle keys on top and four cast keys below. The previews reuse the rigid Fire staff with one fixed vertical placement. The idle uses a planted stance and subtle breathing. The cast goes from anticipation through gather to open-palm release on the third key, then recovery. Keep that palm and the spell origin readable as the hand crosses the staff.

The two GIFs are draft timing previews, with the cast repeated for review. In game the cast is a one-shot that returns to idle. Keep projectile and cast lighting separate from the body, attach the ember head and emission to the common staff transform, and align release to the actual gameplay event. These source poses still need native Aseprite cels, consistent feet and body anchors, and mobile playback validation.

Use Corrected-Cast-Release-Body.png in place of the sheet's third cast pose. The extended left sleeve is now distinct from the right staff arm. In the corrected preview the rigid staff pivots 8.5 degrees around the same ground contact as the right grip moves lower. Keep the shaft length and contact fixed and check the grip transition during native cleanup.

The editable timeline is Fire-Mage-Right-Idle-Cast.aseprite. It uses 36×40 cells for the reach, with four idle frames and four cast frames. The release is the third frame of cast_right. The body, shaft, Fire head and emission each have independent cels. Emission is hidden by default and the Fire head and emission share the same transform. The profile does not expose the rear robe sigil. Frame timings are draft values from the preview. The file was verified by reading back its cels and durations. Opening it in Aseprite and integrating it with game events remain pending.
