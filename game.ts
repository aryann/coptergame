

class Point {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class Dimensions {
    public readonly width: number;
    public readonly height: number;

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
    clear(): void
    drawRect(position: Point, dimensions: Dimensions): void
}

interface FrameFactory {
    newFrame(offset: number): Frame;
}

class HTMLCanvasFrame implements Frame {
    private readonly canvas: HTMLCanvasElement;
    private readonly canvasContext: CanvasRenderingContext2D;
    private readonly offset: number;

    constructor(canvas: HTMLCanvasElement, offset: number) {
        this.canvas = canvas;
        this.canvasContext = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.offset = offset;
    }

    clear(): void {
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRect(position: Point, dimensions: Dimensions): void {
        this.canvasContext.fillStyle = "#cccccc";
        this.canvasContext.fillRect(position.x - this.offset, position.y, dimensions.width, dimensions.height);
    }
}

class HTMLCanvasFrameFactory {
    private readonly canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    newFrame(offset: number): Frame {
        return new HTMLCanvasFrame(this.canvas, offset);
    }
}

interface HelicopterController {
    goUp(): boolean;
}

class HTMLCanvasHelicopterController implements HelicopterController {
    private readonly canvas: HTMLCanvasElement;

    private mouseDown: boolean;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.canvas.addEventListener("mousedown", _ => {
            this.mouseDown = true;
        });
        this.canvas.addEventListener("mouseup", _ => {
            this.mouseDown = false;
        });
    }

    goUp(): boolean {
        return this.mouseDown;
    }
}

interface GameObject {
    draw(frame: Frame): void;
    boundingBox(): Rectangle;
}

class Helicopter implements GameObject {
    private readonly helicopterController: HelicopterController;
    private position: Point;

    constructor(start: Point, helicopterController: HelicopterController) {
        this.position = start;
        this.helicopterController = helicopterController;
    }

    advance(offset: number): void {
        let newY = this.position.y;
        if (this.helicopterController.goUp()) {
            newY -= 1;
        } else {
            newY += 1;
        }
        this.position = new Point(this.position.x + offset, newY);
    }

    draw(frame: Frame): void {
        frame.drawRect(this.position, new Dimensions(20, 20));
    }

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
    private dimensions: Dimensions;
    private offset: number;
    private obstables: Obstacle[];
    private helictoper: Helicopter;

    constructor(frameFactory: FrameFactory, dimensions: Dimensions, helicopterController: HelicopterController) {
        this.offset = 0;
        this.frameFactory = frameFactory;
        this.dimensions = dimensions;
        this.obstables = [];
        this.helictoper = new Helicopter(new Point(this.dimensions.width / 2, this.dimensions.height / 2), helicopterController);
    }

    tick() {
        this.offset += 2;
        this.helictoper.advance(2);
        this.generateNewObstacles();

        // TODO: Remove obstacles that are no longer visible.
    }

    draw() {
        const frame: Frame = this.frameFactory.newFrame(this.offset);
        frame.clear();

        let allObjects: GameObject[] = [this.helictoper];
        allObjects = allObjects.concat(this.obstables);
        for (let gameObject of allObjects) {
            gameObject.draw(frame);
        }
    }

    private generateNewObstacles(): void {
        if (this.offset % 400 != 0) {
            return;
        }

        for (let i = 0; i < 1; i++) {
            this.obstables.push(new Obstacle(
                new Point(this.dimensions.width + this.offset, Math.random() * (this.dimensions.height - 100)),
                new Dimensions(50, 100),
            ));
        }
    }
}

const main = function () {
    let canvas: HTMLCanvasElement = document.getElementById("game") as HTMLCanvasElement;

    let frameFactory: FrameFactory = new HTMLCanvasFrameFactory(canvas);

    let game: Game = new Game(frameFactory, new Dimensions(canvas.width, canvas.height), new HTMLCanvasHelicopterController(canvas));
    setInterval(function () {
        game.tick();
        game.draw();
    }, 1);
};
main();

