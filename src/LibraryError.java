import main.sono.io.Output;

public class LibraryError extends Output {
	private final Listener thread;

	public LibraryError(final Listener thread) {
		this.thread = thread;
	}

	@Override
	public void print(final String s) {
		thread.sendData("LIB-ERR", s, 0, null);
	}
}
