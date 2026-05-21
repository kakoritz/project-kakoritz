#!/bin/bash
set -e
DOCKER=/var/packages/ContainerManager/target/usr/bin/docker
NAS=aspiker@192.168.1.251

echo "Pulling latest image on NAS..."
ssh $NAS "$DOCKER pull ghcr.io/kakoritz/project-kakoritz:latest"

echo "Restarting container..."
ssh $NAS "$DOCKER stop project-kakoritz 2>/dev/null || true"
ssh $NAS "$DOCKER rm project-kakoritz 2>/dev/null || true"
ssh $NAS "$DOCKER run -d --name project-kakoritz --restart unless-stopped -p 8585:80 ghcr.io/kakoritz/project-kakoritz:latest"

echo "Done! Dashboard live at http://192.168.1.251:8585"
