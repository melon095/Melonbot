BINS = $(shell ls -1 cmd)

all: clean build

build:
	@for d in $(BINS); do \
		echo "Building $$d..."; \
		if [ "$$(go env GOOS)" = "windows" ]; then \
			go build -o bin/$$d.exe -mod=readonly -buildvcs=false ./cmd/$$d; \
		else \
			go build -o bin/$$d -mod=readonly -buildvcs=false ./cmd/$$d; \
		fi \
	done

test:
	go test -v ./...

coverage:
	go test -v -covermode=atomic -count=1 -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean:
	go clean
