# Product and domain assumptions

These decisions resolve details that are not explicit in the assessment. They are kept visible so reviewers can evaluate or change them without reverse-engineering the implementation.

## Route inference

The source file contains nodes and outgoing directions, but no explicit edge list. A directed route is therefore inferred from a source node to the nearest node that:

1. is aligned on the required axis;
2. is located on the required side of the source; and
3. is no farther away than `maxNeighborDistance`.

Direction mapping follows the assessment exactly:

- North: increasing X at the same Y
- South: decreasing X at the same Y
- West: increasing Y at the same X
- East: decreasing Y at the same X

Routes are one-way. A reverse route exists only when the destination declares the opposite outgoing direction.

## Validation policy

Blocking errors:

- malformed map structure;
- non-integer node coordinates or QR code;
- duplicate node coordinates;
- invalid direction value;
- non-positive `maxNeighborDistance`;
- malformed charger or chute configuration.

Non-blocking warnings:

- duplicate QR code;
- an outgoing direction with no reachable neighbor;
- an isolated or unreachable node;
- charger and chute present on the same node;
- duplicate human-readable name.

`code: 0` and negative coordinates are allowed because the assessment permits integers and its example explicitly contains code zero.

## Coordinate presentation

The canvas will visually preserve the assessment's industrial coordinate convention: North is positive X and West is positive Y. A visible compass and millimeter units will prevent users from assuming browser-screen coordinates.

## Editing scope

Core editing uses precise inspector fields. Dragging nodes is a bonus interaction and must never be the only way to enter exact coordinates.

Rotation changes only the viewport, never stored map coordinates or directions.

## Persistence

The server persists one active map to a JSON file. Writes will use a temporary file followed by rename to reduce corruption risk. Multi-user editing, version history, and production deployment approval are outside scope.
