// src/utils/animation.js

export const fadeInUp = {
  hidden: { opacity: 0, y: 50 },
  show: {
    opacity: 1,
    y: 0,
    // transition: {
    //   duration: 0.8
    // }
  }
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -50 },
  show: {
    opacity: 1,
    y: 0,
    // transition: {
    //   duration: 0.8
    // }
  }
};

export const fadeIn = {
  hidden: { opacity: 0, x: 0 },
  show: {
    opacity: 1,
    x: 0,
    // transition: {
    //   delay: 1,
    //   duration: 1.5
    // }
  }
};

export const fadeInRight = {
  hidden: { opacity: 0, x: 50 },
  show: {
    opacity: 1,
    x: 0,
    // transition: {
    //   delay: 1,
    //   duration: 0.8
    // }
  }
};

export const fadeInLeft = {
  hidden: { opacity: 0, x: -50 },
  show: {
    opacity: 1,
    x: 0,
    // transition: {
    //   delay: 1,
    //   duration: 0.8
    // }
  }
};
