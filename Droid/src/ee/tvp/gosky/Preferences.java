package ee.tvp.gosky;

import android.app.Activity;
import android.app.FragmentTransaction;
import android.os.Bundle;

public class Preferences extends Activity {

	public static final String SERVER_URL_PREF = "prefServerUrl";
	public static final String INTERVAL_PREF = "prefInterval";	
	public static final String SCENE_MODE_PREF = "prefSceneMode";
	public static final String PICTURE_SIZE_PREF = "prefPictureSize";
	public static final String LENS_CONVERSION = "prefLensConversion";
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		FragmentTransaction transaction = getFragmentManager().beginTransaction(); 
        transaction.add(android.R.id.content, new GoSkyPreferenceFragment());
        transaction.commit();
	}
	
}
