import tensorflow as tf
import numpy as np
from tensorflow.keras.applications.vgg16 import (VGG16, preprocess_input)
import cv2
import mediapipe as mp
import time
import sys

class Landmarks :
    def __init__(self):
        mp_hands = mp.solutions.hands
        mp_pose = mp.solutions.pose
        self.hands = mp_hands.Hands()
        self.pose = mp_pose.Pose()

    def getMarkedImages(self, base64Video):
        result_images = []

        cap = cv2.VideoCapture(base64Video)
        width = cap.get(3)
        height = cap.get(4)

        fps = 25
        update_interval = 1 / fps

        last_update_time = time.time()
        landmarks = Landmarks()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            current_time = time.time()

            if current_time - last_update_time >= update_interval:
                result = landmarks.getMarkedImage(width, height, frame)

                if result["status"]:
                    last_update_time = current_time

                    result_images.append(result["bytesImage"])

        cap.release()
        

        return result_images

    def getMarkedImage(self, width, height, frame):
        hands_results = self.hands.process(frame)
        pose_results = self.pose.process(frame)

        if hands_results.multi_hand_landmarks or pose_results.pose_landmarks:
            blank_img = np.full((int(height), int(width), 3), 255, dtype=np.uint8)

            self.markedPose(pose_results, blank_img, frame)
            self.markedHands(hands_results, blank_img, frame)

            _, encoded_image = cv2.imencode('.jpg', blank_img)
            bytesImage = encoded_image.tobytes()

            return {
                "status": True,
                "bytesImage": bytesImage
            }
        else :
            return {
                "status": False,
            }
        
    def markedPose(self, pose_results, blank_img, frame):
        if pose_results.pose_landmarks:
            landmark_indices = [13, 11, 12, 14]

            for i in range(len(landmark_indices)):
                if i < len(landmark_indices) - 1:
                    start_index = landmark_indices[i]
                    end_index = landmark_indices[i + 1]
                    x1, y1 = int(pose_results.pose_landmarks.landmark[start_index].x * frame.shape[1]), int(
                        pose_results.pose_landmarks.landmark[start_index].y * frame.shape[0])
                    x2, y2 = int(pose_results.pose_landmarks.landmark[end_index].x * frame.shape[1]), int(
                        pose_results.pose_landmarks.landmark[end_index].y * frame.shape[0])
                    cv2.line(blank_img, (x1, y1), (x2, y2), (0, 0, 255), 1)

    def markedHands(self, hands_results, blank_img, frame):
        if hands_results.multi_hand_landmarks:
            for _, hand_landmarks in enumerate(hands_results.multi_hand_landmarks):
                hand_data = []

                for j, landmark in enumerate(hand_landmarks.landmark):
                    x, y = int(landmark.x * frame.shape[1]), int(landmark.y * frame.shape[0])
                    hand_data.append((x, y))

                    cv2.circle(blank_img, (x, y), 3, (0, 0, 255), -1)

                    if j > 0:
                        x_prev, y_prev = hand_data[j - 1]
                        cv2.line(blank_img, (x_prev, y_prev), (x, y), (0, 0, 255), 1)

class Translator:
    def __init__(self, lstmModelPath, input_shape=(224, 224, 3)):
        self.vgg16Model = VGG16(weights='imagenet', include_top=False, input_shape=input_shape)
        self.lstmModel = tf.keras.models.load_model(lstmModelPath)

    def translate(self, bytesImages):
        bytesImages = [self.preprocess_and_decode_vgg(x) for x in bytesImages]
        bytesImages = np.array(bytesImages)
        image = np.mean(bytesImages, axis=0)

        predicted_class = ''

        if not np.isnan(image).any():
            answer = self.lstmModel.predict(image)

            class_names = ['감사합니다', '만나다', '반갑습니다', '안녕하세요']
            predicted_class = class_names[np.argmax(answer)]

        return predicted_class

    def preprocess_and_decode_vgg(self, bytesImage):
        preprocessedImage = tf.image.decode_image(bytesImage, channels=3)
        preprocessedImage = tf.image.resize(preprocessedImage, (224, 224))

        if preprocessedImage is None:
            raise Exception('Invalid input image')

        img_array = preprocess_input(preprocessedImage)

        x_features = self.vgg16Model.predict(np.array([img_array]))
        x_features = x_features.reshape(-1, 49, 512)  # LSTM 모델의 입력 형태로 재구성

        return x_features

class File:
    def write(self, path, content):
        f = open(path, 'w')
        f.write(content)
        f.close()
    
    def read(self, path):
        f = open(path, 'r')
        content = f.read()
        f.close()

        return content

def main(videoPath, lstmModelPath):
    file = File()

    base64Video = file.read(videoPath)
    
    markedImages = Landmarks().getMarkedImages(base64Video)
    result = Translator(lstmModelPath).translate(markedImages)

    file.write(videoPath, result)

main(sys.argv[1], sys.argv[2])