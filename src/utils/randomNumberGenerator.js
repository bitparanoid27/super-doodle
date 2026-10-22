// Random number generator with a seed i.e. initial value.

function lcg(seed) {
    return function () {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
}

export { lcg };
