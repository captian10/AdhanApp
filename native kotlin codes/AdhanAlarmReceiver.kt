package com.captian10.AdhanApp.adhan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AdhanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val prayerName = intent.getStringExtra("prayerName") ?: "Prayer"
    val soundResName = intent.getStringExtra("soundResName") ?: "azan"

    val serviceIntent = Intent(context, AdhanForegroundService::class.java).apply {
      putExtra("prayerName", prayerName)
      putExtra("soundResName", soundResName)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }
}
