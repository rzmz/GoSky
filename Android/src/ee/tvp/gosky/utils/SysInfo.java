package ee.tvp.gosky.utils;

import android.annotation.SuppressLint;
import android.app.ActivityManager;
import android.app.ActivityManager.MemoryInfo;
import android.content.Context;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;

public class SysInfo {

	final static long mebiByte = 1048576L;
	
	public static long getAvailableMemory(Context context){
		MemoryInfo mi = new MemoryInfo();
		ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
		activityManager.getMemoryInfo(mi);
		return mi.availMem / mebiByte;
	}
	
	@SuppressLint("NewApi")
	@SuppressWarnings("deprecation")
	public static long getAvailableSDCardSize(Context context){
		StatFs stat = new StatFs(Environment.getExternalStorageDirectory().getPath());

		long sdAvailSize;
		
		if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2){
			sdAvailSize = (long) stat.getAvailableBlocksLong() * (long) stat.getBlockSizeLong();
		} else {
			sdAvailSize = (long) stat.getAvailableBlocks() * (long)stat.getBlockSize();
		}
		
		return sdAvailSize / mebiByte;
	}
}
