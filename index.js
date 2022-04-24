const GRAVITY = -9.8 // m*s^-2

const TICK_PER_SECOND = 10000;
const SECOND_LIMIT = 100;
const TICK_LIMIT = TICK_PER_SECOND * SECOND_LIMIT;

const THRUST_ACCEL = 30; //

const shouldFireBooster = ({velocity, position}) => {


    const netAccel = THRUST_ACCEL + GRAVITY;

    const h1 = Math.abs(velocity);
    const h2 = Math.abs(-0.75);
    // const area = position; // = (b * h) / 2
    const area = position + 0.01; // = (b*(h1-h2))/2 + b* h2
    // const neededTime = (2*area)/h1;
    const neededTime = (2*area) / (h1 + h2)
    // const neededAccel = h1/neededTime;
    const neededAccel = (h1 - h2)/neededTime;

    return neededAccel >= netAccel;

    // return (position < 50 && velocity < -10) ||( position < 10 && velocity < -1);
}

const LOG_INTERVAL = TICK_PER_SECOND / 10;
const main = () => {
    let groundY_meters = 0;

    let objectY_meters = 100;
    let objectY_velocity = 0; // meters per second

    let tick = 0; // 60th of a simulated second

    let numFired = 0;

    while (tick < TICK_LIMIT && objectY_meters > groundY_meters) {
        objectY_velocity += GRAVITY / TICK_PER_SECOND;
        let fired= false;
        if (shouldFireBooster({velocity: objectY_velocity, position: objectY_meters})) {
            fired = true;
            objectY_velocity += THRUST_ACCEL / TICK_PER_SECOND;
        }
        objectY_meters += objectY_velocity / TICK_PER_SECOND;
        tick += 1;

        numFired += fired ? 1 : 0;

        if (tick %(LOG_INTERVAL) === 0 ) {
            console.log({
                t: (tick/ TICK_PER_SECOND).toFixed(2),
                p: (objectY_meters).toFixed(2),
                v: (objectY_velocity).toFixed(2),
                f: numFired / LOG_INTERVAL,
            })
            numFired = 0;
        }
    }

    console.log({objectY_velocity, seconds: tick / TICK_PER_SECOND})

    console.log(objectY_velocity > 0 ? "wtf?" : objectY_velocity > -1 ? "win!" : "lose!");
};

main();
