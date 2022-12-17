all: clean build

suffix =

ifeq ($(OS),Windows_NT)
	suffix = .exe
endif

file = ./bin/EventSub$(suffix)

build:
	go build -v -o $(file) .

run: build
	chmod a+x $(file)
	$(file)

debug: build
	chmod a+x $(file)
	$(file) -debug

run-debug: build
	chmod a+x ./bin/EventSub
	$(file) -debug

test:
	go test -v ./...

coverage:
	go test -v -covermode=atomic -count=1 -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean:
	go clean