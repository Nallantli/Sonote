import main.sono.io.Output;

public class LibraryOutput extends Output {
	private final Listener thread;
	private final String libname;

	public LibraryOutput(final Listener thread, final String libname) {
		this.thread = thread;
		this.libname = libname;
	}

	@Override
	public void print(final String s) {
		thread.sendData("LIB-OUT", libname, 0, null);
	}
}
