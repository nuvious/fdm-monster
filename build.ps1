$build = "build140224"
docker build --platform=linux/arm64 --push -f .\docker\sqlite.Dockerfile -t fdmmonster/fdm-monster:1.7.0-sqlite-arm64-$build .
docker build --platform=linux/arm64 --push -f .\docker\Dockerfile -t fdmmonster/fdm-monster:1.7.0-arm64-$build .
