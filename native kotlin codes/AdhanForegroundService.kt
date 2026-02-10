package com.captian10.AdhanApp.adhan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.captian10.AdhanApp.MainActivity
import com.captian10.AdhanApp.R
import java.net.URLEncoder

class AdhanForegroundService : Service() {

  private var player: MediaPlayer? = null
  private val channelId = "adhan_alarm_channel"
  private val notifId = 7001

  // Prevent opening the screen multiple times if service restarts quickly
  private var openedUi = false

  override fun onCreate() {
    super.onCreate()
    createChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val prayerName = intent?.getStringExtra("prayerName") ?: "Prayer"
    val soundResName = intent?.getStringExtra("soundResName") ?: "azan"

    // ✅ Required: foreground service must show a notification
    startForeground(notifId, buildNotification(prayerName))

    // ✅ Open full-screen UI (your Expo Router screen)
    if (!openedUi) {
      openedUi = true
      openAdhanScreen(prayerName)
    }

    startPlayback(soundResName)

    return START_NOT_STICKY
  }

  private fun openAdhanScreen(prayerName: String) {
    try {
      val encoded = URLEncoder.encode(prayerName, "UTF-8")
      val uri = Uri.parse("adhanapp://adhan?prayer=$encoded")
      val openIntent = Intent(Intent.ACTION_VIEW, uri).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      startActivity(openIntent)
    } catch (_: Exception) {
      // Fallback: open MainActivity
      try {
        val fallback = Intent(this, MainActivity::class.java).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(fallback)
      } catch (_: Exception) {}
    }
  }

  // ✅ UPDATED: Robust Playback with Fallback
  private fun startPlayback(soundResName: String) {
    stopPlayback()

    // 1. Try the requested sound (e.g., "azan_egypt")
    var resId = resources.getIdentifier(soundResName, "raw", packageName)

    // 2. Fallback: If not found, try "azan" (The default file)
    if (resId == 0) {
      println("AdhanApp: Sound '$soundResName' not found, falling back to 'azan'")
      resId = resources.getIdentifier("azan", "raw", packageName)
    }

    // 3. Last Resort: Try a known specific file if 'azan' is also missing
    if (resId == 0) {
       resId = resources.getIdentifier("azan_nasser_elktamy", "raw", packageName)
    }

    // If resId is still 0, we have no audio files. Stop service to avoid crash.
    if (resId == 0) {
      println("AdhanApp: CRITICAL - No audio files found in res/raw!")
      stopSelf()
      return
    }

    player = MediaPlayer.create(this, resId).apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build()
      )
      isLooping = false
      setOnCompletionListener { stopSelf() }
      start()
    }
  }

  private fun stopPlayback() {
    try { player?.stop() } catch (_: Exception) {}
    try { player?.release() } catch (_: Exception) {}
    player = null
  }

  private fun buildNotification(prayerName: String): Notification {
    // Deep link into your Expo Router screen
    val uri = Uri.parse("adhanapp://adhan?prayer=${URLEncoder.encode(prayerName, "UTF-8")}")
    val openAppIntent = Intent(Intent.ACTION_VIEW, uri).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }

    val openPending = PendingIntent.getActivity(
      this,
      0,
      openAppIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)
    )

    val stopIntent = Intent(this, AdhanStopReceiver::class.java)
    val stopPending = PendingIntent.getBroadcast(
      this,
      1,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)
    )

    return NotificationCompat.Builder(this, channelId)
      .setContentTitle("Adhan - $prayerName")
      .setContentText("Playing adhan")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setOngoing(true)

      // ✅ ALARM behavior
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_MAX)

      // ✅ This makes it behave like alarm clock pop-up on many devices
      .setFullScreenIntent(openPending, true)

      // Tap opens Adhan screen
      .setContentIntent(openPending)

      // Stop action
      .addAction(0, "Stop", stopPending)

      .build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val channel = NotificationChannel(
      channelId,
      "Adhan Alarm",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Foreground service channel for adhan playback"
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC

      // Optional: mark as alarm-like audio behavior for the channel (Android O+)
      val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()

      // If you are NOT using a custom channel sound, you can keep this null
      // and rely on MediaPlayer audio instead (recommended).
      setSound(null, attrs)
    }

    nm.createNotificationChannel(channel)
  }

  override fun onDestroy() {
    stopPlayback()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}