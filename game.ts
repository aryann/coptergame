

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
    drawRect(position: Point, dimensions: Dimensions, color: string): void
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

    drawRect(position: Point, dimensions: Dimensions, color: string): void {
        this.canvasContext.fillStyle = color;
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
    private trail: Point[];

    constructor(start: Point, helicopterController: HelicopterController) {
        super();
        this.position = start;
        this.trail = [];
        this.helicopterController = helicopterController;
    }

    advance(offset: number): void {
        let newY = this.position.y;
        if (this.helicopterController.goUp()) {
            newY -= 1;
        } else {
            newY += 1;
        }
        this.trail.push(this.position);
        this.position = new Point(this.position.x + offset, newY);
    }

    draw(frame: Frame): void {
        // TODO: Make the size configurable.
        for (let point of this.trail) {
            frame.drawRect(point, new Dimensions(20, 20), "#eee");
        }
        frame.drawRect(this.position, new Dimensions(20, 20), "#ccc");
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
        frame.drawRect(this.position, this.dimensions, "#ccc")
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
    generateObstacles(to: number): Obstacle[]
}

class ObstacleGeneratorImpl {
    private readonly dimensions: Dimensions;
    private readonly initialGapSize: number;
    private readonly minGapSize: number;

    private from: number;
    private gapSize: number;
    private heightVarianceDirection: number;

    constructor(dimensions: Dimensions, initialGapSize: number, minGapSize: number) {
        this.initialGapSize = initialGapSize;
        this.dimensions = dimensions;
        this.minGapSize = minGapSize;
        this.from = 0;
        this.gapSize = initialGapSize;
        this.heightVarianceDirection = 1;
    }

    generateBorders(to: number): Obstacle[] {
        var obstacles: Obstacle[] = [];
        while (this.from < to) {
            this.heightVarianceDirection *= Math.random() > 0.9 ? -1 : 1;
            this.gapSize = Math.min(
                this.initialGapSize,
                Math.max(this.gapSize - this.heightVarianceDirection * 10, this.minGapSize),
            );

            const obstacleHeight = (this.dimensions.height - this.gapSize) / 2;
            obstacles.push(new Obstacle(
                new Point(this.from, 0),
                new Dimensions(100, obstacleHeight)));
            obstacles.push(new Obstacle(
                new Point(this.from, this.dimensions.height - obstacleHeight),
                new Dimensions(100, obstacleHeight)));
            this.from += 100;
        }
        return obstacles;
    }

    generateObstacles(to: number): Obstacle[] {
        var obstacles: Obstacle[] = [];
        var x = to - this.dimensions.width;
        const obstaclesPerFrame = 2;
        for (var i = 0; i < obstaclesPerFrame; i++) {
            x += this.dimensions.width / obstaclesPerFrame;
            obstacles.push(new Obstacle(
                new Point(
                    x,
                    Math.random() * (this.dimensions.height - 100)),
                new Dimensions(50, 100)));
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
            this.obstacles.push(...this.obstacleGenerator.generateObstacles(to));
            this.removeOutOfFrameObstacles();
        }
        this.offset += 2;
        this.helicopter.advance(2);
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

    score(): number {
        return this.offset / 2;
    }

    private removeOutOfFrameObstacles(): void {
        var i = 0;
        while (i < this.obstacles.length &&
            this.obstacles[i].boundingBox().to.x < this.offset) {
            i++;
        }
        this.obstacles.splice(0, i);
    }
}

const main = function () {
    const canvas: HTMLCanvasElement = document.getElementById("game") as HTMLCanvasElement;
    const score: HTMLSpanElement = document.getElementById("score") as HTMLSpanElement;

    const frameFactory: FrameFactory = new HTMLCanvasFrameFactory(canvas);
    const dimensions: Dimensions = new Dimensions(canvas.width, canvas.height);

    let game: Game = new Game(
        frameFactory,
        new ObstacleGeneratorImpl(dimensions, dimensions.height * 0.9, dimensions.height * 0.5),
        dimensions,
        new HTMLCanvasHelicopterController(canvas));
    const timer = setInterval(function () {
        score.innerText = game.score().toString();
        game.tick();
        game.draw();
        if (game.hasCollided()) {
            clearInterval(timer);
            console.log("Game over!");
        }
    }, 1);
};
main();

