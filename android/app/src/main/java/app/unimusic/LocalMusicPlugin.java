package app.unimusic;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "LocalMusic",
        permissions = {
                @Permission(
                        alias = "mediaAudio",
                        strings = {Manifest.permission.READ_MEDIA_AUDIO}
                ),
                @Permission(
                        alias = "externalStorage",
                        strings = {Manifest.permission.READ_EXTERNAL_STORAGE}
                )
        }
)
public class LocalMusicPlugin extends Plugin {
    private String permissionName() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return "mediaAudio";
        } else {
            return "externalStorage";
        }
    }

    @PluginMethod()
    public void getSongs(PluginCall call) {
        if (getPermissionState("mediaAudio") == PermissionState.GRANTED) {
            finishGettingSongs(call);
        } else {
            requestPermissionForAlias(permissionName(), call, "finishGettingSongs");
        }
    }

    @PermissionCallback()
    private void finishGettingSongs(PluginCall call) {
        if (getPermissionState(permissionName()) != PermissionState.GRANTED) {
            call.reject("Missing permissions");
            return;
        }

        JSArray songs = new JSArray();
        JSObject result = new JSObject();
        result.put("songs", songs);

        // We query only the ID, since we will extract the other data from the metadata anyways
        String[] projection = {MediaStore.Audio.Media._ID};
        // Only query music
        String selection = String.format("%s = 1", MediaStore.Audio.Media.IS_MUSIC);
        // Format from newest to oldest
        String order = String.format("%s DESC", MediaStore.Audio.Media.DATE_ADDED);

        Cursor cursor = getActivity().getContentResolver().query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                null,
                order
        );

        if (cursor == null) {
            call.resolve(result);
            return;
        }

        int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);

        while (cursor.moveToNext()) {
            JSObject song = new JSObject();
            long id = cursor.getLong(idCol);
            String path = ContentUris.withAppendedId(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    id
            ).toString();

            song.put("id", Long.toString(id));
            song.put("path", path);

            songs.put(song);
        }

        cursor.close();
        call.resolve(result);
    }
}
