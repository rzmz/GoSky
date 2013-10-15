package ee.tvp.gosky.utils;

import android.app.AlertDialog;
import android.app.AlertDialog.Builder;
import android.content.Context;
import android.content.DialogInterface;

public class MessageDialog {
	public static void notice(String message, Context context){
		Builder builder = new Builder(context);
		builder.setTitle("Notice");
		builder.setMessage(message).setCancelable(false).setPositiveButton("OK", new DialogInterface.OnClickListener() {
			
			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		
		AlertDialog notice = builder.create();
		notice.show();
	}
}
