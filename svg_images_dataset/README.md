# Source artwork

The character art behind the battle scene. The app does not read this folder:
the files it ships are in `app/public/art/` (and the copy FastAPI serves
in `server/static/art/`). This folder keeps the takes each pose was
chosen from, so the scene can be re-cut later.

| Folder | Contents |
| --- | --- |
| `artwork/` | The chosen finals, one per pose. |
| `ANGEL/` | Takes for the guardian: flying in, handing the scroll, proud, waving goodbye, flying away. |
| `BOY/` | Takes for the person: frightened, surprised, holding and reading the scroll, ready, punching, victory, silent gratitude. |
| `DEVIL/` | Takes for the tempter: taunting, confused, shocked, angry, hit, sitting defeated. |
| `PUNCH EFFECT/` | Takes for the strike impact burst. |
| `SCROLL/` | Scroll prop references (JPEG). |

File names carry the pose and the time the take was made; a few are truncated
with an ellipsis by the tool that exported them. Two takes are byte-identical
duplicates (`BOY/Surprised_boy_character_pose_…115251` / `…115807`, and
`PUNCH EFFECT/…122253` / `…122253-2`).

## Finals → ids used by the app

| `artwork/` | `app/public/art/` |
| --- | --- |
| `angel_fly.svg` | `a-fly.svg` |
| `angel_after_giving_scroll.svg` | `a-watch.svg` |
| `angel_bye.svg` | `a-bye.svg` |
| `boy_fear.svg` | `m-fear.svg` |
| `boy_get_scroll.svg` | `m-get-scroll.svg` |
| `boy_reads_scroll.svg` | `m-read-scroll.svg` |
| `Boy_ready_for_boxing_match.svg` | `m-ready.svg` |
| `boy_give_a_punch_20261007161036.svg` | `m-punch.svg` |
| `Boy_raising_hands_in_victory.svg` | `m-victory.svg` |
| `devil_ear_secret.svg` | `d-ear-secret.svg` |
| `devil_confused.svg` | `d-confused.svg` |
| `devil_get_bet.svg` | `d-hit.svg` |
| `devil_defeated.svg` | `d-defeated.svg` |
| `hug.svg` | `hug.svg` |

The remaining app art — `orb.svg`, `orb-listening.svg`, `guardian-rest.svg`,
`hills-of-fire.svg`, `cross-of-light.svg`, `punch-effect.svg`, `icon.svg` — was
drawn directly for the design kit and has no take here.

Principles the art follows (see `docs/assets-and-ai-tools.md`): the guardian's
face stays hidden in light, tempters are symbolic, the cross appears only as
light, and no face of God the Father or Jesus is ever depicted.
