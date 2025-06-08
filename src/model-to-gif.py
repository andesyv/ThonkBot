#!/usr/bin/python

from argparse import ArgumentParser
from subprocess import Popen, run
from tempfile import TemporaryDirectory
from pathlib import Path

def number_to_alphabetical(num: int) -> str:
    max_char = ord('z') - ord('a')
    if num <= max_char:
        return chr(ord('a') + num)
    else:
        return 'z' + number_to_alphabetical(num - max_char - 1)

if __name__ != '__main__':
    exit(0)

parser = ArgumentParser(
    prog="model-to-gif",
    description="Convers a 3D model to a gif file"
)
parser.add_argument('input')
parser.add_argument('output')
parser.add_argument('-v', '--verbose', action='store_true')
parser.add_argument('--frames', nargs='?', help="How many frames to render (default is 10)")
args = parser.parse_args()

with TemporaryDirectory() as tmpDir:
    if not Path(tmpDir).exists():
        raise EnvironmentError("Failed to create temporary diriectory")

    frames = int(args.frames) if args.frames is not None else 10
    procs = []
    for i in range(frames):
        angle = i * 360 / frames
        # Seems "magick" sorts alphabetical instead of alphanumerical, so convert the number to an alphabetic string
        tmpPath = Path(tmpDir, f"{number_to_alphabetical(i)}.png")
        if args.verbose:
            print(f"Rendering temporary file {tmpPath} with camera angle {angle}")
        procs.append(Popen([
            "f3d",
            "--input", args.input,
            "--output", tmpPath.as_posix(),
            "--camera-azimuth-angle", f"{angle}",
            "--grid=0"
        ]))

    for i, p in enumerate(procs):
        result = p.wait()
        if result != 0:
            raise RuntimeError(f"Image generation failed with error: {p.stderr}")

        # Verifying the step was successfull
        tmpPath = Path(tmpDir, f"{number_to_alphabetical(i)}.png")
        if not tmpPath.exists():
            raise EnvironmentError(f"Failed to generated intemediate file {tmpPath}")
        
    if args.verbose:
        print("Generating gif...")

    inputGlobPattern = Path(tmpDir, f"*.png")
    base_speed = 30 * 10
    speed = base_speed / frames
    run([
        "convert", # Deprecated: For more modern imagemagick versions, use "magick" instead
        "-delay", f"{speed}",
        "-dispose", "Background",
        "-loop", "0",
        inputGlobPattern.as_posix(),
        args.output
    ])

    # Optimize image
    # run([
    #     "mogrify",
    #     "-layers", "optimize",
    #     "-fuzz", "3%",
    #     args.output
    # ])

if args.verbose:
    print(f"Model was rendered as gif in {args.output}")
