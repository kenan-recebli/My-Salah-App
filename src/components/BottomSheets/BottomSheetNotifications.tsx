import { useEffect, useState } from "react";
import Sheet from "react-modal-sheet";
// @ts-ignore
import Switch from "react-ios-switch";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { Dialog } from "@capacitor/dialog";
import {
  NativeSettings,
  AndroidSettings,
  IOSSettings,
} from "capacitor-native-settings";

import { PreferenceType, userPreferencesType } from "../../types/types";
import {
  bottomSheetContainerStyles,
  checkNotificationPermissions,
  scheduleDailyNotification,
  sheetBackdropColor,
  sheetHeaderHeight,
  TWEEN_CONFIG,
} from "../../utils/constants";

const BottomSheetNotifications = ({
  setShowNotificationsModal,
  showNotificationsModal,
  modifyDataInUserPreferencesTable,
  setUserPreferences,
  userPreferences,
}: {
  setShowNotificationsModal: React.Dispatch<React.SetStateAction<boolean>>;
  showNotificationsModal: boolean;
  modifyDataInUserPreferencesTable: (
    preference: PreferenceType,
    value: string
  ) => Promise<void>;
  setUserPreferences: React.Dispatch<React.SetStateAction<userPreferencesType>>;
  userPreferences: userPreferencesType;
}) => {
  const [dailyNotificationToggle, setDailyNotificationToggle] =
    useState<boolean>(userPreferences.dailyNotification === "1" ? true : false);

  const showNotificationsAlert = async () => {
    const { value } = await Dialog.confirm({
      title: "Open Settings",
      message: `You currently have notifications turned off for this application, you can open Settings to re-enable them`,
      okButtonTitle: "Settings",
      cancelButtonTitle: "Cancel",
    });

    if (value) {
      if (Capacitor.getPlatform() === "ios") {
        NativeSettings.openIOS({
          option: IOSSettings.App,
        });
      } else if (Capacitor.getPlatform() === "android") {
        NativeSettings.openAndroid({
          option: AndroidSettings.AppNotification,
        });
      }
    }
  };

  const cancelNotification = async (id: number) => {
    await LocalNotifications.cancel({ notifications: [{ id: id }] });
  };

  async function handleNotificationPermissions() {
    const userNotificationPermission = await checkNotificationPermissions();

    if (userNotificationPermission === "denied") {
      showNotificationsAlert();
    } else if (userNotificationPermission === "granted") {
      if (dailyNotificationToggle === true) {
        cancelNotification(1);
      } else if (dailyNotificationToggle === false) {
        const [hour, minute] = userPreferences.dailyNotificationTime
          .split(":")
          .map(Number);
        scheduleDailyNotification(hour, minute);
      }
      setDailyNotificationToggle(!dailyNotificationToggle);
    } else if (
      userNotificationPermission === "prompt" ||
      userNotificationPermission === "prompt-with-rationale"
    ) {
      requestPermissionFunction();
    }
  }

  const requestPermissionFunction = async () => {
    // const requestPermission = await LocalNotifications.requestPermissions();
    const { display: requestPermission } =
      await LocalNotifications.requestPermissions();
    if (requestPermission === "granted") {
      setDailyNotificationToggle(true);
      const [hour, minute] = userPreferences.dailyNotificationTime
        .split(":")
        .map(Number);
      scheduleDailyNotification(hour, minute);
      // modifyDataInUserPreferencesTable("1", "dailyNotification");
    } else if (
      requestPermission === "prompt" ||
      requestPermission === "prompt-with-rationale" ||
      requestPermission === "denied"
    ) {
      await modifyDataInUserPreferencesTable("dailyNotification", "0");
    }
  };

  const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPreferences((userPreferences) => ({
      ...userPreferences,
      dailyNotificationTime: e.target.value,
    }));
    const [hour, minute] = e.target.value.split(":").map(Number);

    scheduleDailyNotification(hour, minute);
    await modifyDataInUserPreferencesTable(
      "dailyNotificationTime",
      e.target.value
    );
  };

  useEffect(() => {
    const notificationValue = dailyNotificationToggle === true ? "1" : "0";

    setUserPreferences((userPreferences) => ({
      ...userPreferences,
      dailyNotification: notificationValue,
    }));

    const modifyDBAndState = async () => {
      await modifyDataInUserPreferencesTable(
        "dailyNotification",
        notificationValue
      );
    };

    modifyDBAndState();
  }, [dailyNotificationToggle]);

  return (
    <Sheet
      detent="content-height"
      tweenConfig={TWEEN_CONFIG}
      isOpen={showNotificationsModal}
      onClose={() => setShowNotificationsModal(false)}
    >
      <Sheet.Container style={bottomSheetContainerStyles}>
        <Sheet.Header style={sheetHeaderHeight} />
        <Sheet.Content>
          <div className="h-[50vh]">
            <div className="flex items-center justify-between p-3 notification-text-and-toggle-wrap">
              <p>Turn on Daily Notification</p>{" "}
              <Switch
                checked={dailyNotificationToggle}
                handleColor="white"
                offColor="white"
                onChange={() => {
                  handleNotificationPermissions();
                }}
                onColor="#3b82f6"
              />
            </div>

            {dailyNotificationToggle === true ? (
              <div className="flex items-center justify-between p-3">
                <p>Set Time</p>
                <input
                  onChange={(e) => {
                    handleTimeChange(e);
                  }}
                  style={{ backgroundColor: "transparent" }}
                  className={`${
                    dailyNotificationToggle === true ? "slideUp" : ""
                  } focus:outline-none focus:ring-0 focus:border-transparent w-[auto] time-input`}
                  type="time"
                  dir="auto"
                  id="appt"
                  name="appt"
                  min="09:00"
                  max="18:00"
                  value={userPreferences.dailyNotificationTime}
                  required
                />
              </div>
            ) : null}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        style={sheetBackdropColor}
        onTap={() => setShowNotificationsModal(false)}
      />
    </Sheet>
  );
};

export default BottomSheetNotifications;
