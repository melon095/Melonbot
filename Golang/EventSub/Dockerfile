FROM golang:1.18.1 as builder
ENV GO111MODULE=on
WORKDIR /src
COPY ./Common ./Common
COPY ./EventSub ./EventSub

WORKDIR /src/Common
RUN go mod download
WORKDIR /src/EventSub
RUN go mod download

WORKDIR /src/EventSub

# Some stupid reason with alpine not having required libs
RUN go build -v -ldflags '-extldflags "-static"' /src/EventSub/main.go
RUN ["chmod", "a+x", "./main"]

FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates libc6-compat
COPY --from=builder /src/EventSub/main /app/

EXPOSE 3001

ENTRYPOINT [ "/app/main", "-port", "3001", "-config", "./config.json" ]
