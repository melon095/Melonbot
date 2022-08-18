all: clean build

build:
	go build -v -o ./bin/EventSub .

run: build
	chmod a+x ./bin/EventSub
	./bin/EventSub -config ./../config.json -loglevel info

run-debug: build
	chmod a+x ./bin/EventSub
	./bin/EventSub -config ./../config.json -loglevel debug

test:
	go test -v ./...

coverage:
	go test -v -covermode=atomic -count=1 -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean:
	go clean