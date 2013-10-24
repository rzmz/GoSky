package ee.tvp.gosky;

import android.app.Activity;
import android.app.FragmentTransaction;
import android.os.Bundle;

public class Preferences extends Activity {
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		FragmentTransaction transaction = getFragmentManager().beginTransaction(); 
        transaction.add(android.R.id.content, new GoSkyPreferenceFragment());
        transaction.commit();
	}
}
