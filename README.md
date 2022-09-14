<div align="center">
  <h1>
    ☠️&nbsp;&nbsp;⛳
    <br>
    <br>
    Death Golf
    <br>
    <sup><sub>A <a href="https://js13kgames.com">js13k</a> game in 5.7 Kb</sub></sup>
    <br>
    <kbd>By <a href="https://github.com/jesstelford">Jess Telford</a></kbd>
    <br>
    <br>
  </h1>
  <br>
</div>

Super Stickman Golf meets Angry Birds: If the ball doesn't get destroyed at the end of each shot, you get a +1 penalty.

Try to get to the hole in as few shots as possible.

## Controls

_Mouse required_

When `resting` is shown, Click+drag mouse to aim / choose magnitude of your shot. Release to fire.

To cancel your shot, drag the mouse on top of the ball and release.

## js13kGames 2022 Submission

The git tag [`js13k-2022-submission`](https://github.com/jesstelford/death-golf/tree/js13k-2022-submission) points to the exact commit submitted to the [js13kGames](https://github.com/jesstelford/death-golf/tree/js13k-2022-submission) competition.

## Contributing

### Level Editing

Levels are created in Inkscape as paths (bezier curves compress the best),
exported to svg, then saved to diskas `.svg` files. When a new level is started
in-game, the `.svg` file is loaded and processed to setup the physics,
collision, and various special game objects.

1. Drawing in Inkscape
   1. Use the "Draw freehand lines" tool (P)
   1. Select shape, Path -> Simplify (Opt-L)
1. Styling
   1. "Fill and Stroke" -> Stroke style -> Width -> 0
   1. (for `currentColor`) "Fill and Stroke" -> Fill -> RGBA -> `ff00ff`
1. Attributes
   1. Edit -> XML Editor (Shift-Opt-X)
      1. `data-physics: <boolean>` (default: `false`. If not `true`, path is purely
         for display)
      1. `data-mass: <number>` (default: `0` [ie; immobile])
      1. `data-bounciness: <number>` (default: `0.6`)
      1. `data-static-friction: <number>` (0 <= n <= 1)
      1. `data-dynamic-friction: <number>` (0 <= n <= 1, must be less than
         static friction)
      1. `data-render: <boolean>` (default: `false`)
1. Special objects
   1. Ball
      1. _Default values: `mass: 20, bounciness: 0.6`_
      1. Edit -> XML Editor
         1. `id: "ball"`
         1. `rx` & `ry` must be `10` (to create a circle)
   1. Hole
      1. Edit -> XML Editor
         1. `id: "hole"`
1. Export
   1. Select all
   1. Object -> Ungroup _(to avoid exporting `transform: translate()` styles)_
   1. Deselect all
   1. File -> Export (Shift-Opt-E)
   1. Select "Plain SVG"
   1. Name the level in numerical order with a leading zero
   1. "Export"
1. Add to game
   1. Process the file with `svgo`: `yarn svgo -i levels/<filename>.svg`
   1. Add the result to the `src/index.html`
