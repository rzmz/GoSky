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
	
	public void testWifiButton() throws Exception{
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		// get rid of the HDR dialog for now
		solo.clickOnButton("OK");
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.wifiOn));
		solo.goBack();
	}
	
	public void testSettingsButton() throws Exception {
		solo.assertCurrentActivity("wrong activity", MainActivity.class);
		solo.clickOnButton(solo.getString(ee.tvp.gosky.R.string.menu_settings));
		solo.assertCurrentActivity("wrong activity", Preferences.class);
		solo.goBack();
	}
	
	@Override
	public void tearDown() throws Exception {
		solo.finishOpenedActivities();
	}
}
