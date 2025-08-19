# 3D Bird Flocking Simulation

![A screenshot of the simulation.](asset/ss.001.png?raw=true "A screenshot of the simulation.")

## Features
- Simulates bird flocking behavior in three dimensions.
- Implements a hypertoroidal topology to avoid boundary artifacts.
- Uses a space-partitioning octree to reduce computational complexity from `O(n²)` to `O(n log n)`.
- Multiple rendering options for visualization:
  - Boid scale
  - Boid models
  - Interaction radii
  - Simulation bounds wireframe
  - Simulation octree wireframe
  - Color schemes
- No WebGL! All rendering is performed manually via matrix and vector math for wide compatibility.
- Extensive UI for controlling every simulation and rendering parameter.
  - Explanations of every parameter are provided upon hovering over the corresponding input.
- Intuitive orbiting camera controls, with support for manual view matrix construction.
- Full touch input support for mobile devices.


## Installation
1. Clone the repository:
```bash
git clone https://github.com/nethe550/boids-3d.git
cd boids-3d
```
2. Open the simulation:
    ##### Windows:
    ```bat
    start path/to/boids-3d/impl/index.html
    ```
    ##### Mac OS:
    ```bash
    open path/to/boids-3d/impl/index.html
    ```
    ##### Linux:
    ```bash
    xdg-open path/to/boids-3d/impl/index.html
    ```

    **Or run with a local web server:**
    *Assuming Python 3+ is installed,*
    ```bash
    cd path/to/boids-3d/
    python3 -m http.server
    ```
    And then navigate to http://localhost:8000/impl/index.html.

## Simulation
The simulation is based on the [Boids algorithm](https://en.wikipedia.org/wiki/Boids), developed by Craig Reynolds in 1986. The core idea is that complex flocking behavior can emerge from a few simple rules applied to individual agents, known as "boids". In this simulation, each boid's movement is determined by three primary forces, calculated relative to its neighbors.

#### The Three Rules of Boids
1. **Alignment:** A boid will try to match the average velocity (direction and speed) of its neighbors. This makes the flock move in a uniform direction. The `alignmentForce` and `alignmentBias` parameters control how strongly boids align with others and whether they favor neighbors moving in the same or opposite direction.
2. **Cohesion:** Boids steer toward the average position of their neighbors. This acts as an attractive force, keeping the flock clustered. This force is controlled by the `cohesionForce` parameter.
3. **Separation:** Each boid steers to avoid crowding its immediate neighbors. This creates a repulsive force that prevents boids from colliding. The strength of this force is controlled by the `separationForce` parameter.

#### Logic & Performance
The simulation's main loop is handled by the `Boids.step()` function. In each step, the simulation iterates through all boids, calculates the sum of the three main forces based on their neighbors, and applies the resulting acceleration to update their velocity and position.
- To efficiently locate a boid's neighbors, the simulation uses a space-partitioning octree. Instead of checking every boid against every other boid, which is `O(n²)`, the octree divides 3D space into smaller boxes. This allows the simulation to quickly find neighbors within a boid's interaction radius by only searching relevant boxes, reducing the complexity to a much more manageable `O(n log n)`.
- The simulation exists in a "wrapped" or hypertoroidal space. This means that when a boid moves past the boundary of the simulation volume on one side, it will reappear on the opposite side. This effectively eliminates the need for boundary conditions and allows for more unimpeded flocking behavior.
- Given the relative instability of many parameter permutations of this simulation, boid velocities are clamped to a minimum (`minSpeed`) and a maximum (`maxSpeed`). A small amount of drag is also applied to each boid, and `randomness` is to prevent the flock from becoming overly static or perfectly aligned. All of these properties also coincidentally align closer with bird flocking in reality.

## Rendering
The simulation's rendering engine is a custom implementation written from scratch, bypassing standard libraries like WebGL to enable wide compatibility and provide full control over the rendering pipeline.
- **View & Projection Matrices:** The camera's perspective is defined by a view matrix and a projection matrix. The view matrix transforms world-space coordinates into the camera's local view space, while the projection matrix projects these 3D coordinates into a 2D plane. All objects in the scene are transformed by these matrices when drawn to the screen.
- **Custom Geometry:** The boids are rendered as either a 3D tetrahedron wireframe or a 2D camera-facing billboard. The default tetrahedron model aligns with the boid's velocity to elucidate its direction of motion. The billboard model works similarly, with a few key differences. The billboard model still aligns with the boid's velocity, but it first transforms the velocity vector into the camera's view-space. This is necessary since the billboard will always be normal (perpendicular) to the camera's view direction, and therefore a 3D direction would be useless in rotating the billboard. However, this creates artifacts when the view-space velocity degenerates into a zero-vector, as its view angle will no longer be computable. This can create rapid rotations and angle uncertainty when viewing the boid billboard models along their velocity vector, but it is an inevitable trade-off with the simpler rendering technique.
- **Frustum Culling:** To optimize rendering performance, the renderer only draws objects that are within the camera's view frustum. It achieves this by clipping lines and polygons against a set of six clip-space planes: right, left, top, bottom, far, and near. If an object is completely outside the frustum, it is not rendered at all.
- **Wireframes:** For analysis of the simulation, the renderer can draw any rectangular volume as a wireframe. This is used to visualize elements of the simulation:
  - **Simulation Bounds:** A bounding box showing the valid volume that boids can exist within.
  - **Octree:** The heirarchical bounding boxes of the space-partitioning octree.
- **Billboards:** Alongside the billboard rendering of the boids, it is also used to render the interaction radii of each boid. This shows the radius in which boids will search for neighbors, and consequently interact with them.
- **Procedural Shading:** The boids are colored on a dynamic gradient. This gradient interpolates between two user-defined colors based on the number of neighbors each boid detected in the previous simulation step. This can be used to visualize which boids are interacting with others. The octree also makes use of procedural shading; the octree modifies its alpha (opacity) based on its occupancy relative to the maximum occupancy of each octree node. This elucidates the density of boids in a given area.

## License
<p style="font-family:monospace;">
Copyright © 2025 nethe550<br/>
<br/>
Permission is hereby granted, free of charge, to any person obtaining a copy<br/>
of this software and associated documentation files (the “Software”), to deal<br/>
in the Software without restriction, including without limitation the rights<br/>
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell<br/>
copies of the Software, and to permit persons to whom the Software is<br/>
furnished to do so, subject to the following conditions:<br/>
<br/>
The above copyright notice and this permission notice shall be included in all<br/>
copies or substantial portions of the Software.<br/>
<br/>
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS<br/>
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,<br/>
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE<br/>
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER<br/>
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,<br/>
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE<br/>
SOFTWARE.
</p>