package ee.tvp.gosky.utils;

import android.app.AlertDialog;
import android.app.AlertDialog.Builder;
import android.content.Context;
import android.content.DialogInterface;
import android.content.DialogInterface.OnClickListener;

public class Messenger {
	
	final Context _context;
	
	public Messenger(Context context){
		_context = context; 
	}
	
	public void notice(int messageKey) {
		String message = _context.getResources().getString(messageKey);
		Builder builder = new Builder(_context);
		builder.setTitle("Notice");
		builder.setMessage(message).setCancelable(false).setPositiveButton("OK", new OnClickListener() {
			
			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		
		AlertDialog notice = builder.create();
		notice.show();
	}
	
	public void failure(int messageKey){
		String message = _context.getResources().getString(messageKey);
		Builder builder = new Builder(_context);
		builder.setTitle("Failure");
		builder.setMessage(message).setCancelable(false).setNegativeButton("Exit", new OnClickListener(){

			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
				android.os.Process.killProcess(android.os.Process.myPid());
			}
			
		});
	}
}
