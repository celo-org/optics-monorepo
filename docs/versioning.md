# Code Versioning

Due to the dependency structure in the codebase, it is advantageous to version the Contracts and then pin everything else in the monorepo to the same versioning.

**Versioning Scheme:**

- Monotonically increasing Integer Versions corresponding to implementation contract deployments
  - ex. 1, 2, 3, etc.
- Monorepo is tagged with integer version upon major release
  - The commit a release is associated with will contain agent/deployment code that is compatible with it
  - Agents/build artifacts are versioned using global repo version
