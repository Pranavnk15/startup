import numpy as np
import cv2
import supervision as sv
from ultralytics import YOLO
import argparse
import sys


def parse_arguments():
    parser = argparse.ArgumentParser(
        prog='yolov8',
        description='This program helps detect and count people in the polygon region',
        epilog='Text at the bottom of help'
    )

    parser.add_argument('-i', '--input', default='https://media.istockphoto.com/id/1423119278/video/shibuya-crowd-people-walking-the-zebra-crossing.mp4?s=mp4-640x640-is&k=20&c=09NU2_zPa-4uVgDfa8Awxr-KAI_VtPLaOUpqt4IBr30=', help='Input source (0 for webcam, or provide the video file path)')
    parser.add_argument('-o', '--output', default=None, help='Output video path (optional)')
    parser.add_argument('-c', '--counts', default='zone_counts.txt', help='File to save zone counts')

    # Check if running in a Jupyter Notebook and handle the -f argument
    if 'ipykernel' in sys.modules:
        args = parser.parse_args([])
    else:
        args = parser.parse_args()

    return args

class CountObject():
    def __init__(self, input_source, output_video_path, counts_file):
        self.model = YOLO('yolov8s.pt')
        self.colors = sv.ColorPalette.default()
        self.input_source = input_source
        self.output_video_path = output_video_path
        self.counts_file = counts_file

        # Initialize zones and related attributes here
        polygons = [
            np.array([
                [0, 0],
                [320, 0],
                [320, 150],
                [0, 150]
            ], np.int32),
            np.array([
                [320,0],
                [640,0],
                [640,150],
                [320,150]
            ], np.int32),
            np.array([
                [320,170],
                [640,170],
                [640,350],
                [320,350]
            ], np.int32),
            np.array([
                [0,170],
                [320,170],
                [320,350],
                [0,350]
            ], np.int32)
            
        ]

        self.zones = [
            sv.PolygonZone(
                polygon=polygon,
                frame_resolution_wh=(640, 480)  # You can manually set the frame resolution for the camera
            )
            for polygon in polygons
        ]

        self.zone_annotators = [
            sv.PolygonZoneAnnotator(
                zone=zone,
                color=self.colors.by_idx(index),
                thickness=4,
                text_thickness=4,
                text_scale=2
            )
            for index, zone in enumerate(self.zones)
        ]

        self.box_annotators = [
            sv.BoxAnnotator(
                color=self.colors.by_idx(index),
                thickness=2,
                text_thickness=2,
                text_scale=1
            )
            for index in range(len(polygons))
        ]

        # Initialize count dictionaries for each zone
        self.zone_counts = {index: 0 for index in range(len(polygons))}

    def process_frame(self, frame: np.ndarray, i) -> np.ndarray:
        # detect
        results = self.model(frame, imgsz=1280)[0]
        detections = sv.Detections.from_ultralytics(results)
        detections = detections[(detections.class_id == 0) & (detections.confidence > 0.5)]

        for index, (zone, zone_annotator, box_annotator) in enumerate(zip(self.zones, self.zone_annotators, self.box_annotators)):
            mask = zone.trigger(detections=detections)
            detections_filtered = detections[mask]
            frame = box_annotator.annotate(scene=frame, detections=detections_filtered, skip_label=True)
            frame = zone_annotator.annotate(scene=frame)

            # Update the count for the current zone
            self.zone_counts[index] = len(detections_filtered)

        # Save the updated counts to the file
        self.save_counts_to_file()

        return frame

    def save_counts_to_file(self):
        try:
            with open(self.counts_file, 'w') as f:
                for index, count in self.zone_counts.items():
                    if count>0:
                        f.write(str(1))
                    else:
                        f.write(str(0))
        except Exception as e:
            print(f"An error occurred while writing to the file: {str(e)}")

    def process_video(self):
        cap = cv2.VideoCapture(0) if self.input_source == 0 else cv2.VideoCapture(self.input_source)

        if self.output_video_path is not None:
            fourcc = cv2.VideoWriter_fourcc(*'XVID')
            out = cv2.VideoWriter(self.output_video_path, fourcc, 20.0, (640, 480))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            processed_frame = self.process_frame(frame, 0)  # The '0' is just a placeholder frame index
            cv2.imshow('Processed Video', processed_frame)

            if self.output_video_path is not None:
                out.write(processed_frame)

            if cv2.waitKey(1) & 0xFF == 27:  # Press 'Esc' to exit
                break

        cap.release()
        if self.output_video_path is not None:
            out.release()
        cv2.destroyAllWindows()



if __name__ == "__main__":
    args = parse_arguments()
    obj = CountObject(args.input, args.output, args.counts)
    obj.process_video()
