package ee.tvp.gosky.utils;

import android.content.Context;
import android.content.pm.PackageManager;

public class Camera {
	
	static final String TAG = Camera.class.getSimpleName();
	Context _context = null;

	public Camera(Context context){
		_context = context;
	}
	
	public boolean hasCamera(){
    	return _context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_WIFI);
	}
}
