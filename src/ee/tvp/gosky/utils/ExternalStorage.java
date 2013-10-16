package ee.tvp.gosky.utils;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import android.content.Context;
import android.os.Environment;
import android.util.Log;

public class ExternalStorage {

	static final String TAG = ExternalStorage.class.getSimpleName();
	
	private final Context _context;
	
	public ExternalStorage(Context context){
		_context = context;
	}
	
	public static boolean isAvailable() {
		return Environment.MEDIA_MOUNTED.equals(Environment.getExternalStorageState());
	}

	File getExternalStorageDir(String type, Context context) {
		//return context.getExternalFilesDir(type);
		return Environment.getExternalStoragePublicDirectory(type);
	}
	
    /*
     *  Creates a new file for saving an image in apps external files directory
     *  Creates also the directory if it is not present
     */
    public File createOutputImageFile() {

    	File mediaFile = null;
    	
    	if(ExternalStorage.isAvailable()){
    		
            File mediaStorageDir = new File(getExternalStorageDir(Environment.DIRECTORY_PICTURES, _context), _context.getPackageName());

            if (!mediaStorageDir.exists()){
                if (!mediaStorageDir.mkdirs()){
                    Log.d(TAG, "failed to create directory");
                    return null;
                }
            }
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            mediaFile = new File(mediaStorageDir.getPath() + File.separator + "IMG_"+ timeStamp + ".jpg");
    	}

    	return mediaFile;
    }

}
