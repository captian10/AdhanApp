package com.captian10.AdhanApp.adhan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AdhanStopReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    context.stopService(Intent(context, AdhanForegroundService::class.java))
  }
}
