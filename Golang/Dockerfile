# This dockerfile builds every golang project in /Golang
# To utilize the power of caching each project is built in a separate stage

# The golang_deps_base stage is used to cache the go.mod and go.sum files
# For every new binary, there should be a base and a final stage
# The base stage should be named <binary>_base and the final stage should be named <binary>

# The base stage should copy everything it needs, this is the cmd/<binary> folder and additional files if needed
# The final stage should copy the binary from the base stage and set the entrypoint to keep the image small

ARG GO_VERSION=1.20.0
ARG ALPINE_VERSION=3.17


FROM golang:${GO_VERSION}-alpine${ALPINE_VERSION} as golang_deps_base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY internal /app/internal
COPY cmd /app/cmd

FROM golang_deps_base AS eventsub_base
WORKDIR /app
COPY cmd/EventSub/ /app/cmd/EventSub/
ENV CGO_ENABLED=1
RUN go build -ldflags "-extldflags '-static'" -o ./out ./cmd/EventSub

FROM alpine:${ALPINE_VERSION} as eventsub
WORKDIR /app
COPY --from=eventsub_base /app/out /app/
ENTRYPOINT [ "/app/out", "-config", "/app/config.json", "-debug" ]

