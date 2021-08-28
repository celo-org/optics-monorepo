#### Building Agent Images

There exists a docker build for the agent binaries. These docker images are used for deploying the agents in a production environment. 

```
$ cd rust
$ ./build.sh <image_tag>
$ ./release.sh <image_tag>
```