"use client"
import React from "react";
import { twMerge } from "tailwind-merge";
import { MotionConfig, motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { useGlobalStore } from "@/store/useGlobalStore";



export default function ButtonCst1() {
  return (
    <section className="px-8 py-24 !z-0">
      <div className="mx-auto flex max-w-xs items-center justify-center gap-6 dark:text-black ">
        <Card
          title="5rgny"
          subtitle=" Explore our website, a hub for foodies, travel lovers, and diverse
              content enthusiasts. Discover delightful recipes, travel guides,
              and a wealth of lifestyle insights—something extraordinary for
              everyone!"
        />
      </div>
    </section>
  );
};

const Card = ({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle: string;
  className?: string;
}) => {


  const { setmarquebut } = useGlobalStore();


  return (
    <MotionConfig
      transition={{
        type: "spring",
        bounce: 0.5,
      }}
    >
      <motion.div
        animate={{ x: -8, y: -8 }}
        className={twMerge(
          "group w-full rounded-lg border-2 border-black bg-emerald-300",
          className,
        )}
      >
        <motion.div
          animate={{ x: -8, y: -8 }}
          className={twMerge(
            "-m-0.5 rounded-lg border-2 border-black bg-emerald-300",
            className,
          )}
        >
          <motion.div
            animate={{ x: -8, y: -8 }}
            className={twMerge(
              "relative -m-0.5 flex h-72 flex-col justify-between overflow-hidden rounded-lg border-2 border-black bg-emerald-300 p-8",
              className,
            )}
          >
            <p className="flex items-center text-2xl font-medium uppercase">
              <FiArrowRight className="-ml-0 mr-2 opacity-100 transition-all duration-300 ease-in-out" />
              {title}
            </p>
            <div>
              <p className="mb-10 transition-[margin] duration-300 ease-in-out">
                {subtitle}
              </p>
              <button
                onClick={() => setmarquebut(true)}
                className="absolute bottom-2 left-2 right-2 border-2 border-black bg-white px-4 py-2 text-black opacity-100 transition-all duration-300 ease-in-out"
              >
                5rgny NOW!
              </button>
            </div>

            <motion.svg
              animate={{ rotate: 360 }}
              transition={{
                duration: 25,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
              }}
              style={{
                top: "0",
                right: "0",
                x: "50%",
                y: "-50%",
                scale: 0.75,
              }}
              width="200"
              height="200"
              className="pointer-events-none absolute rounded-full opacity-100"
            >
              <path
                id="circlePath"
                d="M100,100 m-100,0 a100,100 0 1,0 200,0 a100,100 0 1,0 -200,0"
                fill="none"
              />
              <text>
                <textPath
                  href="#circlePath"
                  fill="black"
                  className="fill-black text-2xl font-black uppercase opacity-100 transition-opacity duration-300 ease-in-out"
                >
                  5rgny NOW! • 5rgny NOW! • 5rgny NOW! • 5rgny NOW! •
                </textPath>
              </text>
            </motion.svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
};
