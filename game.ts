

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
        this.mouseDown = false;
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

abstract class GameObject {
    abstract draw(frame: Frame): void;
    abstract boundingBox(): Rectangle;

    collidesWith(other: GameObject): boolean {
        const a = this.boundingBox();
        const b = other.boundingBox();
        return a.from.x < b.to.x &&
            a.to.x > b.from.x &&
            a.from.y < b.to.y &&
            a.to.y > b.from.y;
    }
}

class Helicopter extends GameObject {
    private readonly helicopterController: HelicopterController;
    private position: Point;

    constructor(start: Point, helicopterController: HelicopterController) {
        super();
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
        // TODO: Make the size configurable.
        frame.drawRect(this.position, new Dimensions(20, 20));
    }

    boundingBox() {
        return new Rectangle(
            this.position,
            new Point(this.position.x + 20, this.position.y + 20));
    }

}

class Obstacle extends GameObject {
    private readonly position: Point;
    private readonly dimensions: Dimensions;

    constructor(position: Point, dimensions: Dimensions) {
        super();
        this.position = position;
        this.dimensions = dimensions;
    }

    draw(frame: Frame): void {
        frame.drawRect(this.position, this.dimensions)

    }

    boundingBox() {
        return new Rectangle(
            this.position,
            new Point(
                this.position.x + this.dimensions.width,
                this.position.y + this.dimensions.height));
    }
}

interface ObstacleGenerator {
    generateBorders(to: number): Obstacle[]
}

class ObstacleGeneratorImpl {
    private readonly dimensions: Dimensions;
    private from: number;
    private gapSize: number;
    private heightVariance: number;
    private heightVarianceDirection: number;

    constructor(dimensions: Dimensions, initialGapSize: number) {
        this.dimensions = dimensions;
        this.from = 0;
        this.gapSize = initialGapSize;
        this.heightVariance = 0;
        this.heightVarianceDirection = 1;
    }

    generateBorders(to: number): Obstacle[] {
        var obstacles: Obstacle[] = [];
        while (this.from < to) {
            this.gapSize -= 1;
            this.heightVarianceDirection *= Math.random() > 0.7 ? -1 : 1;
            this.heightVariance += this.heightVarianceDirection * 10;
            this.heightVariance = Math.max(this.heightVariance, 0);
            console.log(this.heightVariance);
            const obstacleHeight = (this.dimensions.height - this.gapSize) / 2;
            obstacles.push(new Obstacle(
                new Point(this.from, 0),
                new Dimensions(100, obstacleHeight + this.heightVariance)));
            obstacles.push(new Obstacle(
                new Point(this.from, this.dimensions.height - obstacleHeight + this.heightVariance),
                new Dimensions(100, obstacleHeight)));
            this.from += 100;
        }
        return obstacles;
    }
}

class Game {
    private frameFactory: FrameFactory;
    private obstacleGenerator: ObstacleGenerator;

    private dimensions: Dimensions;
    private offset: number;
    private obstacleHighWatermark: number;

    private obstacles: Obstacle[];
    private helicopter: Helicopter;

    constructor(frameFactory: FrameFactory, obstacleGenerator: ObstacleGenerator, dimensions: Dimensions, helicopterController: HelicopterController) {
        this.frameFactory = frameFactory;
        this.obstacleGenerator = obstacleGenerator;
        this.dimensions = dimensions;
        this.offset = 0;
        this.obstacleHighWatermark = this.dimensions.width;
        this.obstacles = obstacleGenerator.generateBorders(dimensions.width);
        this.helicopter = new Helicopter(new Point(this.dimensions.width / 2, this.dimensions.height / 2), helicopterController);
    }

    tick(): void {
        if (this.offset % this.dimensions.width == 0) {
            const to = this.offset + 2 * this.dimensions.width;
            this.obstacles.push(...this.obstacleGenerator.generateBorders(to));
        }

        this.offset += 2;
        this.helicopter.advance(2);

        if (this.offset % this.dimensions.width === 0) {
            this.generateNewObstacles();
        }

        // TODO: Remove obstacles that are no longer visible.
    }

    hasCollided(): boolean {
        for (let obstacle of this.obstacles) {
            if (this.helicopter.collidesWith(obstacle)) {
                return true;
            }
        }
        return false;
    }

    draw(): void {
        const frame: Frame = this.frameFactory.newFrame(this.offset);
        frame.clear();

        let allObjects: GameObject[] = [this.helicopter];
        allObjects = allObjects.concat(this.obstacles);
        for (let gameObject of allObjects) {
            gameObject.draw(frame);
        }
    }

    private generateNewObstacles(): void {
        for (let i = 0; i < 2; i++) {
            this.obstacles.push(new Obstacle(
                new Point(
                    this.dimensions.width + this.dimensions.width / 2 * i + this.offset,
                    Math.random() * (this.dimensions.height - 100)),
                new Dimensions(50, 100),
            ));
        }
    }
}

const main = function () {
    let canvas: HTMLCanvasElement = document.getElementById("game") as HTMLCanvasElement;

    let frameFactory: FrameFactory = new HTMLCanvasFrameFactory(canvas);
    const dimensions: Dimensions = new Dimensions(canvas.width, canvas.height);

    let game: Game = new Game(
        frameFactory,
        new ObstacleGeneratorImpl(dimensions, dimensions.height * 0.9),
        dimensions,
        new HTMLCanvasHelicopterController(canvas));
    const timer = setInterval(function () {
        game.tick();
        game.draw();
        if (game.hasCollided()) {
            clearInterval(timer);
            console.log("Game over!");
        }
    }, 1);
};
main();

