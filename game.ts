

class Point {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class Dimensions {
    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}

class Rectangle {
    readonly from: Point;
    readonly to: Point;

    constructor(from: Point, to: Point) {
        this.from = from;
        this.to = to;
    }
}

interface Frame {
    drawRect(position: Point, dimensions: Dimensions): void
}

interface FrameFactory {
    newFrame(offset: number): Frame;
}

class HTMLCanvasFrame {
    private readonly canvas: CanvasRenderingContext2D;
    private readonly offset: number;

    constructor(canvas: CanvasRenderingContext2D, offset: number) {
        this.canvas = canvas;
        this.offset = offset;
    }

    drawRect(position: Point, dimensions: Dimensions): void {
        this.canvas.fillStyle = "#cccccc";
        this.canvas.fillRect(position.x, position.y, dimensions.width, dimensions.height);
    }
}

class HTMLCanvasFrameFactory {
    private readonly canvas: CanvasRenderingContext2D;

    constructor(canvas: CanvasRenderingContext2D) {
        this.canvas = canvas;
    }

    newFrame(offset: number): Frame {
        return new HTMLCanvasFrame(this.canvas, offset);
    }
}

interface GameObject {
    draw(frame: Frame): void;
    boundingBox(): Rectangle;
}

class Helicopter implements GameObject {
    constructor() { }

    draw(frame: Frame): void { }

    boundingBox() {
        return new Rectangle(new Point(0, 0), new Point(0, 0));
    }

}

class Obstacle implements GameObject {
    private readonly position: Point;
    private readonly dimensions: Dimensions;

    constructor(position: Point, dimensions: Dimensions) {
        this.position = position;
        this.dimensions = dimensions;
    }

    draw(frame: Frame): void {
        frame.drawRect(this.position, this.dimensions)

    }

    boundingBox() {
        return null;
    }
}

class Game {
    private frameFactory: FrameFactory;
    private offset: number;
    private obstables: Obstacle[];
    private helictoper: Helicopter;

    constructor(frameFactory: FrameFactory) {
        this.offset = 0;
        this.frameFactory = frameFactory;
        this.obstables = [];
    }

    tick() {
        this.offset += 1;
        this.generateNewObstacles();
        this.helictoper = new Helicopter();
    }

    draw() {
        const frame: Frame = frameFactory.newFrame(this.offset);

        let allObjects: GameObject[] = [this.helictoper];
        allObjects = allObjects.concat(this.obstables);
        for (let gameObject of allObjects) {
            gameObject.draw(frame);
        }
    }

    private generateNewObstacles(): void {
        for (let i = 0; i < 1; i++) {
            this.obstables.push(new Obstacle(
                new Point(this.offset * 150, 0),
                new Dimensions(100, 200),
            ));
        }
    }
}


let canvas: HTMLCanvasElement = document.getElementById("game") as HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
let frameFactory: FrameFactory = new HTMLCanvasFrameFactory(context);

let game: Game = new Game(frameFactory);
setInterval(function () {
    game.tick();
    game.draw();
}, 100);

