package com.captian10.AdhanApp.adhan

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AdhanAlarmModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AdhanAlarm"

  // ✅ UPDATED: Now accepts 'soundName' from React Native
  @ReactMethod
  fun scheduleExact(id: String, triggerAtMs: Double, prayerName: String, soundName: String) {
    val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    val intent = Intent(reactContext, AdhanAlarmReceiver::class.java).apply {
      putExtra("prayerName", prayerName)
      // ✅ Use the dynamic sound name passed from JS (e.g., "azan_mecca")
      putExtra("soundResName", soundName) 
    }

    val reqCode = id.hashCode()
    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)

    val pending = PendingIntent.getBroadcast(reactContext, reqCode, intent, flags)
    val whenMs = triggerAtMs.toLong()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pending)
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, whenMs, pending)
    }
  }

  @ReactMethod
  fun cancel(id: String) {
    val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    val intent = Intent(reactContext, AdhanAlarmReceiver::class.java)
    val reqCode = id.hashCode()

    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)

    val pending = PendingIntent.getBroadcast(reactContext, reqCode, intent, flags)
    alarmManager.cancel(pending)
  }

  // ✅ NEW: stop the currently playing foreground service (so your UI Stop button works)
  @ReactMethod
  fun stopNow(promise: Promise) {
    try {
      val stopped = reactContext.stopService(Intent(reactContext, AdhanForegroundService::class.java))
      promise.resolve(stopped)
    } catch (e: Exception) {
      promise.reject("STOP_FAILED", e)
    }
  }

  // ✅ Optional: check exact alarm permission (Android 12+)
  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(alarmManager.canScheduleExactAlarms())
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}