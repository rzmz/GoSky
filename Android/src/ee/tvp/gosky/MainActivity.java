package ee.tvp.gosky;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
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
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SurfaceView;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;
import android.widget.ToggleButton;
import ee.tvp.gosky.utils.CameraWrapper;
import ee.tvp.gosky.utils.Messenger;
import ee.tvp.gosky.utils.RandomString;
import ee.tvp.gosky.utils.StorageWrapper;
import ee.tvp.gosky.utils.SysInfo;

public class MainActivity extends Activity {
	
	private static final int RESULT_SETTINGS = 1;

	final Context _context = this;
	final Messenger _messenger = new Messenger(_context);

	static final String TAG = MainActivity.class.getSimpleName();

	final Handler _handler = new Handler();

	private SurfaceView _surfaceView = null;
	
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
	ToggleButton _dataButton = null;
	ToggleButton _wifiButton = null;
	ToggleButton _startStopButton = null;
	Button _settingsButton = null;
	
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
		if(_surfaceView == null){
			_surfaceView = (SurfaceView) findViewById(R.id.surfaceView1);
		}
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
        	showPreferences(null);
            break;
 
        }
 
        return true;
    }
	 
	public void showPreferences(View view){
        Intent i = new Intent(this, Preferences.class);
        startActivityForResult(i, RESULT_SETTINGS);
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
    
    static String IDENTITY_FILE_NAME = "gosky_identity_file";
    static int IDENTITY_KEY_LENGTH = 12;
    
    private String _identifierKey = null;
    public String getIndentifierKey(){
    	
    	if(_identifierKey == null){
    		try {
				FileInputStream fin = openFileInput(IDENTITY_FILE_NAME);
				int k = 0;
				_identifierKey = "";
				while((k = fin.read()) != -1){
					_identifierKey += (char)k;
				}
				fin.close();
				Log.d(TAG, "Identifier file read OK");
				if(_identifierKey.length() != IDENTITY_KEY_LENGTH){
					throw new FileNotFoundException("Must regenerate Identifier key!");
				}
			} catch (FileNotFoundException e) {
				_identifierKey = new RandomString(IDENTITY_KEY_LENGTH).nextString();
				try {
					FileOutputStream fout = openFileOutput(IDENTITY_FILE_NAME, Context.MODE_PRIVATE);
					fout.write(_identifierKey.getBytes());
					fout.close();
					Log.d(TAG, "Identifier file write OK");
				} catch (FileNotFoundException e1) {
					Log.w(TAG, "Exception in getIdentifierKey #1");
					e1.printStackTrace();
				} catch (IOException e1) {
					Log.w(TAG, "Exception in getIdentifierKey #2");
					e1.printStackTrace();
				}
				e.printStackTrace();
			} catch (IOException e) {
				Log.e(TAG, "Cannot read identity file!");
				e.printStackTrace();
			}
    	}
    	
    	return _identifierKey;
    }

	@Override
	protected void onCreate(Bundle savedInstanceState) {

		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		
		_wifiButton = (ToggleButton) findViewById(R.id.toggleWifi);
		_dataButton = (ToggleButton) findViewById(R.id.toggleData);
		_startStopButton = (ToggleButton) findViewById(R.id.startStop);
		_settingsButton = (Button) findViewById(R.id.settingsButton);
		_startStopButton.setEnabled(false);
		_startStopButton.setClickable(false);
		_wifiManager = (WifiManager) getSystemService(Context.WIFI_SERVICE);
		_connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
				
		prepareApplication();
		
	}
			
	@Override
	protected void onDestroy(){
		CameraWrapper.getInstance().release();
		handlerRemoveCallbacks();		
		super.onDestroy();
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
			_settingsButton.setEnabled(false);
			_settingsButton.setClickable(false);
		} else {
			handlerRemoveCallbacks();
			_settingsButton.setEnabled(true);
			_settingsButton.setClickable(true);
		}
		
		Toast.makeText(this, "Application " + (_isTakingPictures ? "started" : "stopped"), Toast.LENGTH_SHORT).show();

	}

	private SharedPreferences _sharedPreferences = null;	
	public SharedPreferences getPref(){
		if(_sharedPreferences == null){
			_sharedPreferences = PreferenceManager.getDefaultSharedPreferences(this);
		}
		return _sharedPreferences;
	}
	
	private void setData(){
		
		_uploadScriptUrl = getPref().getString(Preferences.SERVER_URL_PREF, "");

		if (!_uploadScriptUrl.contains("http://")) {
			_uploadScriptUrl = String.format("http://%s", _uploadScriptUrl);
		}

		String scriptFileLocation = "/public/api/uploadfiles.php";
		
		if (!_uploadScriptUrl.contains(scriptFileLocation)) {
			_uploadScriptUrl = String.format("%s%s", _uploadScriptUrl, scriptFileLocation);
		}
		
		// add identifier key to upload script url
		String identifierParameter = String.format("?identifierKey=%s", getIndentifierKey());
		if(!_uploadScriptUrl.contains(identifierParameter)){
			_uploadScriptUrl += identifierParameter;
		}

		_interval = Integer.parseInt(getPref().getString(Preferences.INTERVAL_PREF, "5"));

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