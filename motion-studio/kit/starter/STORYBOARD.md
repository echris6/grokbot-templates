# Starter storyboard (10 s, 16:9, cuts on a 120 BPM grid)

| Time | Shot | What it proves | Cut out (what carries across) |
|---|---|---|---|
| 0.0–2.5 | **Money shot (frame 0 finished):** product name and tagline left, the real product UI (shot 1) right, tilted in 3D and drifting in | What it is, in its own words and its own UI | The focus region of shot 1 is cropped out and zooms to fill about 80% of the frame: the persistent actor |
| 2.5–5.5 | **Cause → effect:** the lifted UI region fills the frame with a slow push. A command bar docks on it, fact 1 types in, a cursor travels to the button and clicks (ripple). The button fills with a check, the UI answers with a light sweep and an outline | Fact 1, as an action on the real UI with a visible result | The panel recedes as two more screens rise |
| 5.5–8.5 | Shots 2 and 3 rise as a stack and fan apart. Fact 2 is the title. A selection outline lands on shot 3, which comes forward | Fact 2, and that there's more than one screen | The screens fold into the logo slot just before the music's final hit |
| 8.5–10.0 | **End card (1.5 s, never still):** optional logo, name, CTA, URL; an underline draws, a light sweep crosses the name, a 12 % push | The name and the one next action | End |

- Cuts for `qa.sh` and the music grid: `2.5,5.5,8.5`. They are carried transitions, so no hard cut is expected. The music's final hit lands on 8.5 (`sample-audio.sh`, `CARD=8.5`).
- Sound: `assets/sfx/plan.json` puts a soft air pass on each carry (2.18, 5.2), barely-there ticks on typing, a clear click on the press (4.3), a pop on the state change (4.48) and a tick on the selection (6.7).
- Safe zone: nothing but the sample label (on its backplate) in the bottom 90 px; the selected card stays inside the frame.
- Timings live in `index.html` (`render(t)`) and `assets/sfx/plan.json`; change them there and in this table together.
