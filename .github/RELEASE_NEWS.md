## New Features & Improvements

### Computer Control
- Added an opt-in computer-control flow that can be requested from Capri's chat or voice conversation for explicit click actions.
- The compact upper-right panel now shows the primary-screen preview Capri uses to identify a target.
- Desktop control and its compact preview are off by default; the setting directly below independently shows or hides the panel after the feature is enabled.
- Each proposed click appears in a separate lower-right notification with **Allow** and **Refuse** actions; dismissal and timeout cancel it.
- Added a click-through Capri cursor overlay that marks the proposed target and animates there after approval without replacing the user's system cursor.
- Added a **Stop** control to cancel a pending action or cursor movement, plus platform-specific permission checks and clear unavailable-state handling.
- Computer control is currently limited to one user-confirmed click at a time; arbitrary action sequences and full application operation are not included.