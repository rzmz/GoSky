package ee.tvp.gosky.utils;

import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.widget.Toast;
import ee.tvp.gosky.MainActivity;

public class PreferencesWrapper {
	
	public static final String PREFS_NAME = "GoSkyPreferencesFile"; 
	private SharedPreferences _settings = null;
	private MainActivity _activity = null;
	
	public PreferencesWrapper(MainActivity activity){
		_activity = activity;
		_settings = activity.getSharedPreferences(PREFS_NAME, 0);
	}

	public SharedPreferences getSettings(){
		return _settings;
	}
	
	public Editor getEditor(){
		return getSettings().edit();
	}
	
	public void editBoolean(String key, boolean value){
		getEditor().putBoolean(key, value);
		getEditor().commit();
		showToast(key, Boolean.toString(value));
	}
	
	public void editString(String key, String value){
		getEditor().putString(key, value);
		getEditor().commit();
		showToast(key, value);
	}
	
	public void editInteger(String key, int value){
		getEditor().putInt(key, value);
		getEditor().commit();
		showToast(key, Integer.toString(value));
	}
	
	private void showToast(String key, String value) {
		Toast.makeText(_activity.getContext(), String.format("Pref '%s' set to '%s'", key, value), Toast.LENGTH_SHORT).show();
	}
}
