package ee.tvp.gosky.utils;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import android.content.Context;
import android.os.Environment;
import android.util.Log;

public class StorageWrapper {

	static final String TAG = StorageWrapper.class.getSimpleName();
	
	private final Context _context;
	
	public StorageWrapper(Context context){
		_context = context;
	}
	
	public static boolean isStorageAvailable() {
		return Environment.MEDIA_MOUNTED.equals(Environment.getExternalStorageState());
	}

	File getpublicDirectory() {
		return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
	}
	
	File getAppDirectory(){
		return _context.getExternalFilesDir(Environment.DIRECTORY_DCIM);
	}
	
	public String getOutputImageFileName(){
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        return String.format("IMG_%s.jpg", timeStamp);
	}
	
    /*
     *  Creates a new file for saving an image in apps external files directory
     *  Creates also the directory if it is not present
     */
    public File createOutputImageFile() {

    	File mediaFile = null;
    	
    	if(StorageWrapper.isStorageAvailable()){
    		
            File mediaStorageDir = new File(getpublicDirectory(), _context.getPackageName());

            if (!mediaStorageDir.exists()){
                if (!mediaStorageDir.mkdirs()){
                    Log.d(TAG, "failed to create directory");
                    return null;
                }
            }
            
            mediaFile = new File(mediaStorageDir.getPath() + File.separator + getOutputImageFileName());
    	}

    	return mediaFile;
    }

}
