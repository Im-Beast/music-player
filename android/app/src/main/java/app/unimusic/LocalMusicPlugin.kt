package app.unimusic

import android.Manifest
import android.content.ContentUris
import android.os.Build
import android.provider.MediaStore
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "LocalMusic",
    permissions = [
        Permission(alias = "mediaAudio", strings = [Manifest.permission.READ_MEDIA_AUDIO]),
        Permission(alias = "externalStorage", strings = [Manifest.permission.READ_EXTERNAL_STORAGE])
    ]
)
class LocalMusicPlugin : Plugin() {
    private fun permissionName(): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return "mediaAudio"
        } else {
            return "externalStorage"
        }
    }

    @PluginMethod
    fun getSongs(call: PluginCall) {
        if (getPermissionState("mediaAudio") == PermissionState.GRANTED) {
            finishGettingSongs(call)
        } else {
            requestPermissionForAlias(permissionName(), call, "finishGettingSongs")
        }
    }

    @PermissionCallback
    private fun finishGettingSongs(call: PluginCall) {
        if (getPermissionState(permissionName()) != PermissionState.GRANTED) {
            call.reject("Missing permissions")
            return
        }

        val songs = JSArray()
        val result = JSObject()
        result.put("songs", songs)

        // We query only the ID, since we will extract the other data from the metadata anyways
        val projection = arrayOf(MediaStore.Audio.Media._ID)
        // Only query music
        val selection = String.format("%s = 1", MediaStore.Audio.Media.IS_MUSIC)
        // Format from newest to oldest
        val order = String.format("%s DESC", MediaStore.Audio.Media.DATE_ADDED)

        val cursor = activity.contentResolver.query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            null,
            order
        )

        if (cursor == null) {
            call.resolve(result)
            return
        }

        val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)

        while (cursor.moveToNext()) {
            val song = JSObject()
            val id = cursor.getLong(idCol)
            val path = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                .toString()

            song.put("id", id.toString())
            song.put("path", path)

            songs.put(song)
        }

        cursor.close()
        call.resolve(result)
    }
}
