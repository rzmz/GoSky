package ee.tvp.gosky;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Camera;
import android.net.ConnectivityManager;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.util.Log;
import android.view.Menu;
import android.view.SurfaceView;
import android.view.View;
import android.widget.EditText;
import android.widget.ToggleButton;
import ee.tvp.gosky.utils.AsyncHttpPostTask;

public class MainActivity extends Activity implements Camera.PreviewCallback, Camera.ErrorCallback, Camera.ShutterCallback, Camera.PictureCallback, Camera.AutoFocusCallback {

    public static final int MEDIA_TYPE_IMAGE = 1;
    public static final String TAG = MainActivity.class.getSimpleName();
    private Camera _myCamera;
    private final Handler _handler = new Handler();
    private View _view = null;
    // time interval in seconds
    private int _interval = 60;
    private boolean _externalStorageAvailable = false;
    private boolean _externalStorageWritable = false;
    private boolean _isTakingPictures = false;
    private String _uploadScriptUrl = null;

    private ToggleButton _wifiButton = null;
    private WifiManager _wifiManager = null;

    private ToggleButton _dataButton = null;

    private ConnectivityManager _connectivityManager = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        _wifiButton = (ToggleButton) findViewById(R.id.toggleWifi);
        _wifiManager = (WifiManager) this.getSystemService(Context.WIFI_SERVICE);
        _wifiButton.setChecked(_wifiManager.isWifiEnabled());
        _dataButton = (ToggleButton) findViewById(R.id.toggleData);
        _connectivityManager = (ConnectivityManager) this.getSystemService(Context.CONNECTIVITY_SERVICE);
        _dataButton.setChecked(getMobileDataEnabled());
        initCamera();
    }

    private void initCamera(){

    	if(_myCamera != null) {
    		_myCamera.release();
    	}
    	
        if(_myCamera == null){
            if(checkCameraHardware(getBaseContext())){
                _myCamera = getCameraInstance();
            }
        }

        if(_myCamera != null){
            setCameraParameters();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

//    @Override
//    protected void onPause(){
//        super.onPause();
//        if(_myCamera != null){
//            _myCamera.release();
//            Log.d(TAG, "Camera released, app paused");
//        }
//        if(_isTakingPictures){
//            handlerRemoveCallbacks();
//        }
//    }

    @Override
    protected void onDestroy(){
        super.onDestroy();
        if(_myCamera != null){
            _myCamera.release();
            Log.d(TAG, "Camera released, app destroyed");
        }
    }

//    @Override
//    protected void onResume(){
//        super.onResume();
//        try {
//            if(_myCamera != null){
//                _myCamera.reconnect();
//            }
//        } catch (IOException e) {
//            Log.d(TAG, "Error reconnecting to Camera!");
//        }
//    }

    /** Check if this device has a camera */
    private boolean checkCameraHardware(Context context) {
        if (context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA)){
            // this device has a camera
            return true;
        } else {
            // no camera on this device
            return false;
        }
    }

    /** A safe way to get an instance of the Camera object. */
    private Camera getCameraInstance(){
        Camera c = null;
        try {
            c = Camera.open(); // attempt to get a Camera instance
        }
        catch (Exception e){
            // Camera is not available (in use or does not exist)
        }
        return c; // returns null if camera is unavailable
    }

    public void toggleWifi(View view){
        _wifiManager.setWifiEnabled(!_wifiManager.isWifiEnabled());
        Log.d(TAG, String.format("Wifi connection %s", _wifiManager.isWifiEnabled() ? "enabled" : "disabled"));
    }

    private boolean getMobileDataEnabled() {
        try {
            Method method = _connectivityManager.getClass().getMethod("getMobileDataEnabled");
            return (Boolean) method.invoke(_connectivityManager);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private void setMobileDataEnabled(boolean on) {
        try {
            Method method = _connectivityManager.getClass().getMethod("setMobileDataEnabled", boolean.class);
            method.invoke(_connectivityManager, on);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void toggleData(View view) {
        setMobileDataEnabled(!getMobileDataEnabled());
        Log.d(TAG, String.format("Data connection %s", getMobileDataEnabled() ? "enabled" : "disabled"));
    }

    /**
     * This method gets called from the activity_main view when start/stop button is pressed
     * @param view
     */
    public void toggleAction(View view){
        _view = view;
        _isTakingPictures = !_isTakingPictures;
        ToggleButton _button = (ToggleButton) findViewById(R.id.startStop);
        EditText _uploadUrl = (EditText) findViewById(R.id.uploadUrl);
        EditText _intervalSeconds = (EditText) findViewById(R.id.intervalSeconds);

        _uploadScriptUrl = _uploadUrl.getText().toString();

        if(!_uploadScriptUrl.toLowerCase().contains("http://")){
            _uploadScriptUrl = String.format("http://%s", _uploadScriptUrl);
        }

        if(!_uploadScriptUrl.toLowerCase().contains("/uploadfiles.php")){
            _uploadScriptUrl = String.format("%s/uploadfiles.php", _uploadScriptUrl);
        }

        _interval = Integer.parseInt(_intervalSeconds.getText().toString());

        if(_interval == 0){
            _interval = 60;
        }

        Log.d(TAG, "Upload script url set to: " + _uploadScriptUrl);
        Log.d(TAG, "Time interval set to: " + _interval);

        if(!_isTakingPictures){
            handlerRemoveCallbacks();
        } else {
            handlerPostDelayed();
        }
    }

    private long getIntervalInMillis(){
        return _interval * 1000;
    }

    private Runnable _runnable = new Runnable() {
        @Override
        public void run() {
            takePicture();
            handlerPostDelayed();
        }
    };

    private void handlerPostDelayed(){
        _handler.postDelayed(_runnable, getIntervalInMillis());
    }

    private void handlerRemoveCallbacks(){
        _handler.removeCallbacks(_runnable);
    }

    private void setCameraParameters(){
        Camera.Parameters parameters = _myCamera.getParameters();
        List<Camera.Size> sizes = parameters.getSupportedPictureSizes();

        int max = 0;
        int index = 0;

        for (int i = 0; i < sizes.size(); i++){
            Camera.Size s = sizes.get(i);
            int size = s.height * s.width;
            if (size > max) {
                index = i;
                max = size;
            }
        }

        parameters.setPictureSize(sizes.get(index).width, sizes.get(index).height);
        parameters.setJpegQuality(100);

        _myCamera.setParameters(parameters);

        Log.d(TAG, String.format("Camera size set to: %sx%s", parameters.getPictureSize().width, parameters.getPictureSize().height));
    }

    private void takePicture(){

        if(_myCamera != null){
            try {
                Log.d(TAG, "Start of taking picture");
                SurfaceView dummy = new SurfaceView(_view.getContext());
                _myCamera.setPreviewDisplay(dummy.getHolder());
                _myCamera.startPreview();
                _myCamera.setPreviewCallback(this);
                _myCamera.setErrorCallback(this);
                _myCamera.autoFocus(this);
                _myCamera.takePicture(null, null, this);
                Log.d(TAG, "End of taking picture");
            } catch (Throwable e){
                Log.d(TAG, "Exception in takePicture: " + e.getMessage());
                e.printStackTrace();
            }
        }
        else {
            Log.d(TAG, "No camera present!");
        }
    }

    /** Create a File for saving an image or video */
    private File getOutputMediaFile(int type){
        // To be safe, you should check that the SDCard is mounted
        // using Environment.getExternalStorageState() before doing this.

        String directory = Environment.DIRECTORY_PICTURES;

        /*
         There are two options for getting a storage directory on the SD card:
         Environment.getExternalStoragePublicDirectory(): this uses a public directory. If the app is uninstalled, the photos will remain.
         Context.getExternalFilesDir(): this uses a directory which is private to the app. If the app is uninstalled, the photos will also be deleted.
        */

        File mediaStorageDir = new File(Environment.getExternalStoragePublicDirectory(directory), getPackageName());

        // Create the storage directory if it does not exist
        if (!mediaStorageDir.exists()){
            if (!mediaStorageDir.mkdirs()){
                Log.d(TAG, "failed to create directory");
                return null;
            }
        }

        // Create a media file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        File mediaFile;
        if (type == MEDIA_TYPE_IMAGE){
            mediaFile = new File(mediaStorageDir.getPath() + File.separator + "IMG_"+ timeStamp + ".jpg");
        } else {
            return null;
        }

        return mediaFile;
    }

    @Override
    public void onPreviewFrame(byte[] bytes, Camera camera) {
        Log.d(TAG, "Start onPreviewFrame");
    }

    @Override
    public void onError(int i, Camera camera) {
        Log.d(TAG, "Start onError");
    }

    @Override
    public void onShutter() {
        Log.d(TAG, "Start onShutter");
    }

    @Override
    public void onPictureTaken(byte[] bytes, Camera camera) {
        Log.d(TAG, "Start onPictureTaken");

        if(bytes == null || bytes.length == 0){
            Log.d(TAG, "Image size is 0, nothing to save.");
            return;
        }

        File pictureFile = getOutputMediaFile(MEDIA_TYPE_IMAGE);
        if (pictureFile == null){
            Log.d(TAG, "Error creating media file, check storage permissions.");
            return;
        }

        try {
            Log.d(TAG, "File name: " + pictureFile.getAbsolutePath());
            FileOutputStream fos = new FileOutputStream(pictureFile);
            fos.write(bytes);
            fos.close();
            _myCamera.stopPreview();
            new AsyncHttpPostTask(_uploadScriptUrl).execute(pictureFile);
        } catch (FileNotFoundException e) {
            Log.d(TAG, "File not found: " + e.getMessage());
            e.printStackTrace();
        } catch (IOException e) {
            Log.d(TAG, "Error accessing file: " + e.getMessage());
            e.printStackTrace();
        } catch (Throwable e){
            Log.d(TAG, "Unknown error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void onAutoFocus(boolean b, Camera camera) {
        Log.d(TAG, "Autofocus");
    }
}
