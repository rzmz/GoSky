package ee.tvp.gosky;

import java.lang.reflect.Method;
import java.util.List;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Camera;
import android.hardware.Camera.Parameters;
import android.net.ConnectivityManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SurfaceView;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;
import android.widget.ToggleButton;
import ee.tvp.gosky.utils.CameraWrapper;
import ee.tvp.gosky.utils.Messenger;
import ee.tvp.gosky.utils.PreferencesWrapper;
import ee.tvp.gosky.utils.StorageWrapper;
import ee.tvp.gosky.utils.SysInfo;

public class MainActivity extends Activity {
	
	private static final int RESULT_SETTINGS = 1;
	 
	private PreferencesWrapper _preferences = null;
	private SharedPreferences _settings = null;
	
	final Context _context = this;
	final Messenger _messenger = new Messenger(_context);

	static final String TAG = MainActivity.class.getSimpleName();

	final Handler _handler = new Handler();

	SurfaceView _surfaceView = null;
	
	int _interval = 60;
	boolean _isTakingPictures = false;
	String _uploadScriptUrl = null;

	WifiManager _wifiManager = null;
	ConnectivityManager _connectivityManager = null;

	CameraWrapper _camera = null;
	StorageWrapper _storage = null;

	String _serverUrl = null;
	String _cameraSize = null;
	String _minimumCameraSize = null;
	
	// UI elements
	EditText _uploadUrlEditText = null;
	ToggleButton _dataButton = null;
	ToggleButton _wifiButton = null;
	ToggleButton _startStopButton = null;
	
	public Context getContext(){
		return _context;
	}
	
	public StorageWrapper getStorage(){
		return _storage;
	}
	
	public String getUploadScriptUrl(){
		return _uploadScriptUrl;
	}
	
	public SurfaceView getSurfaceView(){
		return _surfaceView;
	}
	
	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		getMenuInflater().inflate(R.menu.main, menu);
		return true;
	}

	@Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
 
        case R.id.menu_settings:
            Intent i = new Intent(this, Preferences.class);
            startActivityForResult(i, RESULT_SETTINGS);
            break;
 
        }
 
        return true;
    }
 
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
 
        switch (requestCode) {
        case RESULT_SETTINGS:
        	Log.d(TAG, "something, something, something dark side!");
            break;
 
        }
 
    }
	@Override
	protected void onCreate(Bundle savedInstanceState) {

		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);

		setDefaults();
		
		_wifiButton = (ToggleButton) findViewById(R.id.toggleWifi);
		_dataButton = (ToggleButton) findViewById(R.id.toggleData);
		_startStopButton = (ToggleButton) findViewById(R.id.startStop);
		_startStopButton.setEnabled(false);
		_startStopButton.setClickable(false);
		_surfaceView = (SurfaceView) findViewById(R.id.surfaceView1);
		_wifiManager = (WifiManager) getSystemService(Context.WIFI_SERVICE);
		_connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
				
		prepareApplication();
		wireSpinners();

	}
	
	void setDefaults(){
		
		if(_preferences == null)
			_preferences = new PreferencesWrapper(this);
		if(_settings == null)
			_settings = _preferences.getSettings();

		_serverUrl = _settings.getString("serverUrl", "");
		_interval = _settings.getInt("interval", 5);
		_cameraSize = _settings.getString("cameraSize", "");
	}
		
	@Override
	protected void onDestroy(){
		CameraWrapper.getInstance().release();
		handlerRemoveCallbacks();		
		super.onDestroy();
	}

	void wireSpinners(){
//		Spinner pictureSettingsSpinner = (Spinner) findViewById(R.id.pictureSizeSpinner);
//		ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, getCameraSizesList());
//		adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
//		pictureSettingsSpinner.setAdapter(adapter);
//		pictureSettingsSpinner.setOnItemSelectedListener(new OnItemSelectedListener() {
//
//			@Override
//			public void onItemSelected(AdapterView<?> parent, View view, int pos, long id) {
//				String selectedItem = (String) parent.getItemAtPosition(pos);
//				Toast.makeText(getContext(), String.format("Size set to %s", selectedItem), Toast.LENGTH_SHORT).show();
//			}
//
//			@Override
//			public void onNothingSelected(AdapterView<?> parent) {
//				Toast.makeText(getContext(), "Nothing selected, using default", Toast.LENGTH_SHORT).show();				
//			}
//			
//		});
//		Spinner intervalSpinner = (Spinner) findViewById(R.id.intervalSpinner);
//		intervalSpinner.setOnItemSelectedListener(new OnItemSelectedListener() {
//
//			@Override
//			public void onItemSelected(AdapterView<?> parent, View view, int pos, long id) {
//			}
//
//			@Override
//			public void onNothingSelected(AdapterView<?> parent) {
//				Toast.makeText(getContext(), "No change, using default", Toast.LENGTH_SHORT).show();
//			}
//		});
	}

	/**
	 * Checks device features and shows notice when no camera is found
	 */
	private void prepareApplication() {

		if (!StorageWrapper.isStorageAvailable()) {
			_messenger.failure(R.string.externalStorageUnavailable);
		} else {
			_storage = new StorageWrapper(this);
		}

		if (!hasCamera()) {
			_messenger.failure(R.string.cameraUnavailable);
		} else {
			_camera = new CameraWrapper(this);
		}

		if (hasWifi()) {
			_wifiButton.setChecked(_wifiManager.isWifiEnabled());
		} else {
			_wifiButton.setClickable(false);
			_wifiButton.setEnabled(false);
			_messenger.notice(R.string.no_wifi_present);
			Log.i(TAG, getResources().getString(R.string.no_wifi_present));
		}
		
		_dataButton.setChecked(getMobileDataEnabled());
		
		if(!hasHdr()){
			_messenger.notice(R.string.hdrUnavailable);
		}
		
	}

	private boolean hasCamera() {
		return getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA) && Camera.getNumberOfCameras() > 0;
	}

	private boolean hasWifi() {
		return getPackageManager().hasSystemFeature(PackageManager.FEATURE_WIFI);
	}

	public void toggleWifi(View view) {
		_wifiManager.setWifiEnabled(!_wifiManager.isWifiEnabled());
		Log.d(TAG,
				String.format("Wifi connection %s",
						_wifiManager.isWifiEnabled() ? "disabled" : "enabled"));
		Toast.makeText(this, String.format("%s WIFI", (_wifiManager.isWifiEnabled() ? "Disabling" : "Enabling")), Toast.LENGTH_SHORT).show();
	}

	private boolean getMobileDataEnabled() {
		try {
			Method method = _connectivityManager.getClass().getMethod(
					"getMobileDataEnabled");
			return (Boolean) method.invoke(_connectivityManager);
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}
	}

	private void setMobileDataEnabled(boolean on) {
		try {
			Method method = _connectivityManager.getClass().getMethod(
					"setMobileDataEnabled", boolean.class);
			method.invoke(_connectivityManager, on);
		} catch (NoSuchMethodException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void toggleData(View view) {
		setMobileDataEnabled(!getMobileDataEnabled());
		Log.d(TAG, String.format("Data connection %s",
				getMobileDataEnabled() ? "disabled" : "enabled"));
		
		Toast.makeText(this, String.format("%s mobile data", (getMobileDataEnabled() ? "Disabling" : "Enabling")), Toast.LENGTH_SHORT).show();

	}

	public void toggleAction(View view) {

		_isTakingPictures = !_isTakingPictures;

		if (_isTakingPictures) {
			setData();
			handlerPostDelayed();
		} else {
			handlerRemoveCallbacks();
		}
		
		Toast.makeText(this, "Application " + (_isTakingPictures ? "started" : "stopped"), Toast.LENGTH_SHORT).show();

	}

	private void setData(){
		_uploadScriptUrl = _uploadUrlEditText.getText().toString();

		if (!_uploadScriptUrl.contains("http://")) {
			_uploadScriptUrl = String.format("http://%s", _uploadScriptUrl);
		}

		if (!_uploadScriptUrl.contains("/uploadfiles.php")) {
			_uploadScriptUrl = String.format("%s/uploadfiles.php",
					_uploadScriptUrl);
		}

		if (_uploadScriptUrl.contains("grim")) {
			_uploadScriptUrl = _uploadScriptUrl.replace("grim", "84.50.139.87");
		}

		// todo: hardcoded interval
		_interval = 5;

		if (_interval == 0) {
			_interval = 60;
		}

		Log.d(TAG, "Upload script url set to: " + _uploadScriptUrl);
		Log.d(TAG, "Time interval set to: " + _interval);
		
	}
	
	private long getIntervalInMillis() {
		return _interval * 1000;
	}

	private void monitor(){
		Log.d("MONITOR",
				String.format("Available memory: %dMiB",
						SysInfo.getAvailableMemory(_context)));
		Log.d("MONITOR",
				String.format("External storage state: %s",
						Environment.getExternalStorageState()));
		Log.d("MONITOR",
				String.format("Available SD Card size: %dMiB",
						SysInfo.getAvailableSDCardSize(_context)));		
	}
	
	private Runnable mainOperation = new Runnable() {
		@Override
		public void run() {
			_camera.takePicture();
			monitor();
			handlerPostDelayed();
		}
	};

	private void handlerPostDelayed() {
		_handler.postDelayed(mainOperation, getIntervalInMillis());
	}

	private void handlerRemoveCallbacks() {
		_handler.removeCallbacks(mainOperation);
	}

	@SuppressLint("InlinedApi")
	private boolean hasHdr(){
		boolean hdr = false;
		if(_camera != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1){
			if(CameraWrapper.getInstance() != null){
				Parameters parameters = CameraWrapper.getInstance().getParameters();
				List<String> supportedSceneModes = parameters.getSupportedSceneModes();
				if(supportedSceneModes != null && supportedSceneModes.size() > 0){
					hdr = parameters.getSupportedSceneModes().contains(Parameters.SCENE_MODE_HDR);					
				}
			}
		}
		return hdr;
	}

	public void setAppReady(boolean state) {		
		_startStopButton.setClickable(state);
		_startStopButton.setEnabled(state);	
		Log.d(TAG, "Setting app ready");
	}
	
}
