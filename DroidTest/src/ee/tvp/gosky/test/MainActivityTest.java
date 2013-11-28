package ee.tvp.gosky.test;

import android.test.ActivityInstrumentationTestCase2;

import com.jayway.android.robotium.solo.Solo;

import ee.tvp.gosky.MainActivity;
import ee.tvp.gosky.Preferences;

public class MainActivityTest extends
		ActivityInstrumentationTestCase2<MainActivity> {
	private Solo solo;

	public MainActivityTest() {
		super(MainActivity.class);
	}

	public void setUp() throws Exception {
		solo = new Solo(getInstrumentation(), getActivity());
	}
	
	public void testCamera(){
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.wifiOn));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.dataOn));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.dataOff));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.menu_settings));
		solo.clickOnText("Upload URL");
		solo.clearEditText(0);
		solo.enterText(0, "orlo8.weebly.com");
		solo.clickOnButton("OK");
		solo.goBack();
		solo.clickOnButton("Start");
		solo.sleep(10000);
		solo.clickOnButton("Stop");
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.wifiOff));
		/*
		solo.goBack();
		solo.clickOnButton("Yes");
		*/
	}
	/*
	public void testButtons() throws Exception{
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		// get rid of the HDR dialog for now
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.id.startStop));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.wifiOn));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.dataOn));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.dataOff));
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.menu_settings));
		solo.assertCurrentActivity("wrong activity", Preferences.class);
		solo.goBack();				
	}*/
	/*public void testWifiButton() throws Exception{
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		// get rid of the HDR dialog for now
		solo.clickOnButton("Wifi");
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.wifiOn));
		solo.goBack();
	}
	public void testDataButton() throws Exception {
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		solo.clickOnButton("Data");
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.dataOn));
		solo.assertCurrentActivity("wrong activity", Preferences.class);
		solo.goBack(); 
	} 
	public void testSettingsButton() throws Exception {
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		solo.clickOnButton("Settings");
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.menu_settings));
		solo.assertCurrentActivity("wrong activity", Preferences.class);
		solo.goBack();
	} */
	
	@Override
	public void tearDown() throws Exception {
		solo.finishOpenedActivities();
	}
}
