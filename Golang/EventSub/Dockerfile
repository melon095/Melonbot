FROM golang:1.18.1 as Go
ADD . /src
WORKDIR /src/cmd/backend
# Some stupid reason with alpine not having required libs
RUN go build -v -ldflags '-extldflags "-static"'
RUN ["chmod", "a+x", "./EventSub"]

FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates libc6-compat
COPY --from=Go /src/cmd/backend/backend /app/

EXPOSE 3000

ENTRYPOINT [ "/app/EventSub" ]