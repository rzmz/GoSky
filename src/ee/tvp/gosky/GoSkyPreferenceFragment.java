package ee.tvp.gosky;

import java.util.List;

import android.hardware.Camera;
import android.hardware.Camera.Size;
import android.os.Bundle;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.Preference.OnPreferenceClickListener;
import android.preference.PreferenceFragment;
import ee.tvp.gosky.utils.CameraWrapper;

public class GoSkyPreferenceFragment extends PreferenceFragment {

	public static final String TAG = GoSkyPreferenceFragment.class.getSimpleName();
	
	public static final String SERVER_URL_PREF = "serverUrlPref";
	public static final String INTERVAL_PREF = "intervalPref";	
	public static final String SCENE_MODE_PREF = "sceneModePref";
	public static final String PICTURE_SIZE_PREF = "pictureSizePref";

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		//setPreferenceScreen(cameraPreferencesScreen());
		addPreferencesFromResource(R.xml.general_preferences);
		
		final ListPreference pictureSizePreference = (ListPreference) findPreference(PICTURE_SIZE_PREF);
		setPicturePreferenceData(pictureSizePreference);
		pictureSizePreference.setOnPreferenceClickListener(new OnPreferenceClickListener(){

			@Override
			public boolean onPreferenceClick(Preference preference) {
				setPicturePreferenceData(pictureSizePreference);
				return false;
			}
			
		});
		
		final ListPreference sceneModePreference = (ListPreference) findPreference(SCENE_MODE_PREF);
		setSceneModePreferenceData(sceneModePreference);
		sceneModePreference.setOnPreferenceClickListener(new OnPreferenceClickListener() {
			
			@Override
			public boolean onPreferenceClick(Preference preference) {
				setSceneModePreferenceData(sceneModePreference);
				return false;
			}
		});
	}
	
	private void setSceneModePreferenceData(ListPreference pref){
		List<String> supportedSceneModes = CameraWrapper.getSupportedSceneModes();
		if(supportedSceneModes != null){
			String[] keys = new String[supportedSceneModes.size()];
			String[] values = new String[supportedSceneModes.size()];
			int index = 0;
			for(String mode : supportedSceneModes){
				keys[index] = mode;
				values[index] = mode;
				index++;
			}
			pref.setEntries(keys);
			pref.setDefaultValue(keys[0]);
			pref.setEntryValues(values);
		}
	}
	
	private void setPicturePreferenceData(ListPreference pref){
		List<Camera.Size> pictureSizes = CameraWrapper.getParameters().getSupportedPictureSizes();
		if(pictureSizes != null){
			String[] keys = new String[pictureSizes.size()];
			String[] values = new String[pictureSizes.size()];
			int index = 0;
			for(Size size : pictureSizes){
				keys[index] = Integer.toString(size.hashCode());
				values[index] = String.format("%dx%d", size.width, size.height);
				index++;
			}
			pref.setEntryValues(keys);
			pref.setDefaultValue(keys[0]);
			pref.setEntries(values);
		}
	}
}
